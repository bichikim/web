pub(super) struct AlphaSampler {
    pipeline: wgpu::ComputePipeline,
    sampler: wgpu::Sampler,
    size: wgpu::Buffer,
    buffers: Option<AlphaBuffers>,
}

struct AlphaBuffers {
    pixels: wgpu::Buffer,
    readback: wgpu::Buffer,
}

fn buffer(device: &wgpu::Device, size: u64, usage: wgpu::BufferUsages) -> wgpu::Buffer {
    device.create_buffer(&wgpu::BufferDescriptor {
        label: Some("Poffo alpha sample"),
        mapped_at_creation: false,
        size,
        usage,
    })
}

impl AlphaSampler {
    pub(super) fn new(device: &wgpu::Device) -> Self {
        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Poffo alpha sampling"),
            source: wgpu::ShaderSource::Wgsl(include_str!("alpha.wgsl").into()),
        });
        let pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("Poffo alpha sampling"),
            layout: None,
            module: &shader,
            entry_point: Some("sample_alpha"),
            compilation_options: Default::default(),
            cache: None,
        });
        let sampler = device.create_sampler(&wgpu::SamplerDescriptor {
            mag_filter: wgpu::FilterMode::Linear,
            min_filter: wgpu::FilterMode::Linear,
            ..Default::default()
        });
        let size = buffer(
            device,
            8,
            wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
        );
        Self {
            pipeline,
            sampler,
            size,
            buffers: None,
        }
    }

    pub(super) fn encode(
        &mut self,
        device: &wgpu::Device,
        queue: &wgpu::Queue,
        encoder: &mut wgpu::CommandEncoder,
        source: &wgpu::TextureView,
        size: [u32; 2],
    ) -> wgpu::Buffer {
        use wgpu::BindingResource::{Sampler, TextureView};
        use wgpu::BufferUsages as Usage;
        let bytes = u64::from(size[0]) * u64::from(size[1]) * 4;
        let buffers = self
            .buffers
            .take()
            .filter(|buffers| buffers.readback.size() == bytes)
            .unwrap_or_else(|| AlphaBuffers {
                pixels: buffer(device, bytes, Usage::STORAGE | Usage::COPY_SRC),
                readback: buffer(device, bytes, Usage::COPY_DST | Usage::MAP_READ),
            });
        queue.write_buffer(&self.size, 0, bytemuck::cast_slice(&size));
        let group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: Some("Poffo alpha sample"),
            layout: &self.pipeline.get_bind_group_layout(0),
            entries: &[
                wgpu::BindGroupEntry {
                    binding: 0,
                    resource: TextureView(source),
                },
                wgpu::BindGroupEntry {
                    binding: 1,
                    resource: Sampler(&self.sampler),
                },
                wgpu::BindGroupEntry {
                    binding: 2,
                    resource: buffers.pixels.as_entire_binding(),
                },
                wgpu::BindGroupEntry {
                    binding: 3,
                    resource: self.size.as_entire_binding(),
                },
            ],
        });
        {
            let mut pass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor::default());
            pass.set_pipeline(&self.pipeline);
            pass.set_bind_group(0, &group, &[]);
            pass.dispatch_workgroups(size[0].div_ceil(8), size[1].div_ceil(8), 1);
        }
        encoder.copy_buffer_to_buffer(&buffers.pixels, 0, &buffers.readback, 0, bytes);
        let readback = buffers.readback.clone();
        self.buffers = Some(buffers);
        readback
    }
}

pub(super) async fn read_alpha(
    device: &wgpu::Device,
    buffer: wgpu::Buffer,
) -> Result<Vec<u8>, String> {
    let slice = buffer.slice(..);
    crate::readback::map(device, &slice).await?;
    let mapped = slice.get_mapped_range();
    let alpha = mapped.chunks_exact(4).map(|pixel| pixel[0]).collect();
    drop(mapped);
    buffer.unmap();
    Ok(alpha)
}
