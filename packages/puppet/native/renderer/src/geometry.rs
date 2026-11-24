//! Batched leaf geometry; feedback returns mesh coordinates, never rendered pixels.
#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;
const CORRECTIONS: usize = 1024;
const FLAG_BYTES: u64 = ((CORRECTIONS + 1) * 4) as u64;
const POINT_BYTES: u64 = 8;
// A WGSL array of vec2<f32> starts at an eight-byte boundary after the flags.
const PACKED_HEADER_BYTES: u64 = FLAG_BYTES.next_multiple_of(POINT_BYTES);
const PACKED_JOB: u32 = 1 << 31;
const PACKED_OFFSET_SHIFT: u32 = 3;
struct Buffers {
    commands: wgpu::Buffer,
    values: wgpu::Buffer,
    flags: wgpu::Buffer,
    readback: wgpu::Buffer,
    capacities: [u64; 4],
    revision: u64,
}
pub(crate) struct GeometryTarget {
    pub(crate) positions: wgpu::Buffer,
    binding: Option<(u64, wgpu::BindGroup)>,
}
impl GeometryTarget {
    pub(crate) fn new(
        device: &wgpu::Device,
        size: u64,
        label: &str,
        extra_usage: wgpu::BufferUsages,
    ) -> Self {
        Self {
            positions: device.create_buffer(&wgpu::BufferDescriptor {
                label: Some(label),
                size,
                usage: wgpu::BufferUsages::STORAGE
                    | wgpu::BufferUsages::COPY_DST
                    | wgpu::BufferUsages::COPY_SRC
                    | extra_usage,
                mapped_at_creation: false,
            }),
            binding: None,
        }
    }
    fn bind(&mut self, device: &wgpu::Device, pipeline: &wgpu::ComputePipeline, buffers: &Buffers) {
        if self
            .binding
            .as_ref()
            .is_some_and(|(revision, _)| *revision == buffers.revision)
        {
            return;
        }
        let group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("Geometry buffers"),
            layout: &pipeline.get_bind_group_layout(0),
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: self.positions.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: buffers.commands.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 2,
                    resource: buffers.values.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 4,
                    resource: buffers.flags.as_entire_binding(),
                },
            ],
        });
        self.binding = Some((buffers.revision, group));
    }
}
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub struct GeometryKernel {
    device: wgpu::Device,
    queue: wgpu::Queue,
    pipeline: wgpu::ComputePipeline,
    buffers: Option<Buffers>,
    #[cfg(target_arch = "wasm32")]
    standalone: Option<GeometryTarget>,
    corrections: Vec<u32>,
    overflow: bool,
    retained: crate::upload::UploadCache,
}
#[cfg(target_arch = "wasm32")]
fn failure(message: impl ToString) -> JsValue {
    JsValue::from_str(&message.to_string())
}
fn validate(vertices: &[f32], commands: &[u32], values: &[f32]) -> Result<(), String> {
    if !vertices.len().is_multiple_of(2)
        || !commands.len().is_multiple_of(4)
        || !values.len().is_multiple_of(4)
        || commands.len() / 4 > 65535
    {
        return Err("Invalid geometry buffer layout".into());
    }
    let mut ranges = Vec::with_capacity(commands.len() / 4);
    for job in commands.chunks_exact(4) {
        let length = match job[3] {
            1 => 14,
            2..=4 => 12,
            5 => 8,
            _ => return Err("Unknown geometry operation".into()),
        };
        let end = u64::from(job[0]) + u64::from(job[1]);
        if end > vertices.len() as u64 / 2 || u64::from(job[2]) + length > values.len() as u64 / 4 {
            return Err("Geometry operation exceeds its buffers".into());
        }
        ranges.push((job[0], end));
    }
    ranges.sort_unstable();
    if ranges
        .windows(2)
        .any(|pair| u64::from(pair[1].0) < pair[0].1)
    {
        return Err("Geometry jobs overlap".into());
    }
    Ok(())
}
impl GeometryKernel {
    fn prepare(&mut self, sizes: [u64; 4]) {
        if self.buffers.as_ref().is_some_and(|b| {
            b.capacities
                .iter()
                .zip(sizes)
                .all(|(&cap, size)| cap >= size)
        }) {
            return;
        }
        let capacities = sizes.map(|size| size.max(16).next_power_of_two());
        let buffer = |label, bytes, usage| {
            self.device.create_buffer(&wgpu::BufferDescriptor {
                label: Some(label),
                size: bytes,
                usage,
                mapped_at_creation: false,
            })
        };
        let [positions_size, commands_size, values_size, packed_size] = capacities;
        let commands = buffer(
            "Geometry jobs",
            commands_size,
            wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_DST,
        );
        let values = buffer(
            "Geometry coefficients",
            values_size,
            wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_DST,
        );
        let flags = buffer(
            "Geometry rounding feedback and packed positions",
            PACKED_HEADER_BYTES + packed_size,
            wgpu::BufferUsages::STORAGE
                | wgpu::BufferUsages::COPY_DST
                | wgpu::BufferUsages::COPY_SRC,
        );
        let readback = buffer(
            "Geometry readback",
            (positions_size + FLAG_BYTES).max(PACKED_HEADER_BYTES + packed_size),
            wgpu::BufferUsages::MAP_READ | wgpu::BufferUsages::COPY_DST,
        );
        let revision = self
            .buffers
            .as_ref()
            .map_or(0, |buffers| buffers.revision + 1);
        self.buffers = Some(Buffers {
            commands,
            values,
            flags,
            readback,
            capacities,
            revision,
        });
    }
}
impl GeometryKernel {
    pub(crate) async fn on_device(
        device: wgpu::Device,
        queue: wgpu::Queue,
    ) -> Result<Self, String> {
        let errors = device.push_error_scope(wgpu::ErrorFilter::Validation);
        let source = [
            "/*\n",
            include_str!("geometry/LICENSE"),
            "\n*/\n",
            include_str!("geometry/words.wgsl"),
            include_str!("geometry/float.wgsl"),
            include_str!("geometry/expansion.wgsl"),
            include_str!("geometry/kernel.wgsl"),
        ]
        .concat();
        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Poffo precise geometry"),
            source: wgpu::ShaderSource::Wgsl(source.into()),
        });
        let pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("Poffo precise geometry"),
            layout: None,
            module: &shader,
            entry_point: Some("main"),
            compilation_options: Default::default(),
            cache: None,
        });
        if let Some(error) = errors.pop().await {
            return Err(error.to_string());
        }
        Ok(Self {
            device,
            queue,
            pipeline,
            buffers: None,
            #[cfg(target_arch = "wasm32")]
            standalone: None,
            corrections: Vec::new(),
            overflow: false,
            retained: crate::upload::UploadCache::default(),
        })
    }
    pub(crate) fn commit(&mut self, target: &GeometryTarget, vertices: &[f32]) {
        let bytes = bytemuck::cast_slice(vertices);
        for range in self.retained.update(bytes) {
            self.queue
                .write_buffer(&target.positions, range.start as u64, &bytes[range.clone()]);
        }
    }
}
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
impl GeometryKernel {
    pub async fn create() -> Result<GeometryKernel, JsValue> {
        let instance = wgpu::Instance::new(wgpu::InstanceDescriptor {
            backends: wgpu::Backends::BROWSER_WEBGPU,
            ..wgpu::InstanceDescriptor::new_without_display_handle()
        });
        let adapter = instance
            .request_adapter(&wgpu::RequestAdapterOptions {
                power_preference: wgpu::PowerPreference::HighPerformance,
                ..Default::default()
            })
            .await
            .map_err(failure)?;
        let (device, queue) = adapter
            .request_device(&wgpu::DeviceDescriptor {
                label: Some("Poffo geometry"),
                required_limits: wgpu::Limits::downlevel_defaults()
                    .using_resolution(adapter.limits()),
                ..Default::default()
            })
            .await
            .map_err(failure)?;
        Self::on_device(device, queue).await.map_err(failure)
    }
    pub async fn evaluate(
        &mut self,
        vertices: Vec<f32>,
        commands: Vec<u32>,
        values: Vec<f32>,
    ) -> Result<Vec<f32>, JsValue> {
        self.evaluate_on(vertices, commands, values, None, || Ok(false))
            .await
            .map(|result| result.expect("Standalone geometry cannot be cancelled"))
            .map_err(failure)
    }
    #[wasm_bindgen(js_name = corrections)]
    pub fn wasm_corrections(&self) -> Vec<u32> {
        self.corrections()
    }
    #[wasm_bindgen(js_name = overflow)]
    pub fn wasm_overflow(&self) -> bool {
        self.overflow()
    }
}
impl GeometryKernel {
    pub fn corrections(&self) -> Vec<u32> {
        self.corrections.clone()
    }
    pub fn overflow(&self) -> bool {
        self.overflow
    }
}
impl GeometryKernel {
    pub(crate) async fn evaluate_on(
        &mut self,
        mut vertices: Vec<f32>,
        mut commands: Vec<u32>,
        values: Vec<f32>,
        target: Option<&mut GeometryTarget>,
        is_cancelled: impl FnOnce() -> Result<bool, String>,
    ) -> Result<Option<Vec<f32>>, String> {
        validate(&vertices, &commands, &values)?;
        self.corrections.clear();
        self.overflow = false;
        if commands.is_empty() {
            self.retained.invalidate();
            return Ok(Some(vertices));
        }
        let positions_size = vertices.len() as u64 * 4;
        let packed_count: u64 = commands.chunks_exact(4).map(|job| u64::from(job[1])).sum();
        let packed_size = packed_count * POINT_BYTES;
        let storage_limit = self.device.limits().max_storage_buffer_binding_size;
        let compact = packed_size <= positions_size / 2
            && packed_count < u64::from(PACKED_JOB >> PACKED_OFFSET_SHIFT)
            && PACKED_HEADER_BYTES + packed_size.max(16).next_power_of_two() <= storage_limit;
        let sizes = [
            positions_size,
            commands.len() as u64 * 4,
            values.len() as u64 * 4,
            if compact { packed_size } else { 0 },
        ];
        if sizes.iter().any(|&size| size > storage_limit) {
            return Err("Geometry buffers exceed device limits".into());
        }
        if compact {
            // Preserve the operation in the low three bits. Each job owns a disjoint output range.
            let mut offset = 0;
            for job in commands.chunks_exact_mut(4) {
                job[3] |= PACKED_JOB | (offset << PACKED_OFFSET_SHIFT);
                offset += job[1];
            }
        }
        self.prepare(sizes);
        let buffers = self.buffers.as_ref().unwrap();
        let target = match target {
            Some(target) => target,
            #[cfg(not(target_arch = "wasm32"))]
            None => return Err("Native geometry requires a resident target".into()),
            #[cfg(target_arch = "wasm32")]
            None => {
                if self
                    .standalone
                    .as_ref()
                    .is_none_or(|target| target.positions.size() < sizes[0])
                {
                    self.standalone = Some(GeometryTarget::new(
                        &self.device,
                        buffers.capacities[0],
                        "Geometry positions",
                        wgpu::BufferUsages::empty(),
                    ));
                }
                self.standalone.as_mut().unwrap()
            }
        };
        target.bind(&self.device, &self.pipeline, buffers);
        self.queue
            .write_buffer(&target.positions, 0, bytemuck::cast_slice(&vertices));
        self.queue
            .write_buffer(&buffers.commands, 0, bytemuck::cast_slice(&commands));
        self.queue
            .write_buffer(&buffers.values, 0, bytemuck::cast_slice(&values));
        self.queue
            .write_buffer(&buffers.flags, 0, &0_u32.to_le_bytes());
        let mut encoder = self
            .device
            .create_command_encoder(&wgpu::CommandEncoderDescriptor {
                label: Some("Poffo geometry frame"),
            });
        {
            let mut pass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
                label: Some("Poffo precise geometry"),
                timestamp_writes: None,
            });
            pass.set_pipeline(&self.pipeline);
            pass.set_bind_group(0, &target.binding.as_ref().unwrap().1, &[]);
            pass.dispatch_workgroups((commands.len() / 4) as u32, 1, 1);
        }
        let (flags_start, readback_size) = if compact {
            let size = PACKED_HEADER_BYTES + packed_size;
            encoder.copy_buffer_to_buffer(&buffers.flags, 0, &buffers.readback, 0, size);
            (0, size)
        } else {
            encoder.copy_buffer_to_buffer(
                &target.positions,
                0,
                &buffers.readback,
                0,
                positions_size,
            );
            encoder.copy_buffer_to_buffer(
                &buffers.flags,
                0,
                &buffers.readback,
                positions_size,
                FLAG_BYTES,
            );
            (positions_size, positions_size + FLAG_BYTES)
        };
        crate::readback::submit_and_map(
            &self.device,
            &self.queue,
            encoder.finish(),
            &buffers.readback,
            readback_size,
        )
        .await?;
        let slice = buffers.readback.slice(0..readback_size);
        match is_cancelled() {
            Ok(false) => {}
            result => {
                buffers.readback.unmap();
                return result.map(|_| None);
            }
        }
        let mapped = slice.get_mapped_range();
        let flags = bytemuck::cast_slice::<u8, u32>(
            &mapped[flags_start as usize..(flags_start + FLAG_BYTES) as usize],
        );
        let count = flags[0] as usize;
        self.overflow = count > CORRECTIONS;
        self.corrections
            .extend_from_slice(&flags[1..1 + count.min(CORRECTIONS)]);
        let result = if compact {
            let packed = bytemuck::cast_slice::<u8, f32>(&mapped[PACKED_HEADER_BYTES as usize..]);
            let mut offset = 0;
            for job in commands.chunks_exact(4) {
                let start = job[0] as usize * 2;
                let len = job[1] as usize * 2;
                vertices[start..start + len].copy_from_slice(&packed[offset..offset + len]);
                offset += len;
            }
            vertices
        } else {
            bytemuck::cast_slice::<u8, f32>(&mapped[..positions_size as usize]).to_vec()
        };
        self.retained.replace(bytemuck::cast_slice(&result));
        drop(mapped);
        buffers.readback.unmap();
        Ok(Some(result))
    }
}
