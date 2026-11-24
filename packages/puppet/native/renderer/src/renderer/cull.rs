//! Triangle winding classification keeps the positions and output indices on one device.
use super::{Part, frame::write_updates};
use crate::upload::UploadCache;
use std::collections::HashMap;
use wgpu::util::DeviceExt;

const WORKGROUP_SIZE: u32 = 64;
const TRIANGLE_WORDS: usize = 5;

pub(super) struct CullTriangles {
    pipeline: wgpu::ComputePipeline,
    authored: wgpu::Buffer,
    active: wgpu::Buffer,
    flags: Vec<u32>,
    upload: UploadCache,
    groups: HashMap<wgpu::Buffer, wgpu::BindGroup>,
    workgroups: u32,
}

pub(super) fn determinant(points: &[f32], indices: &[u32]) -> f64 {
    let a = indices[0] as usize * 2;
    let b = indices[1] as usize * 2;
    let c = indices[2] as usize * 2;
    (f64::from(points[b]) - f64::from(points[a]))
        * (f64::from(points[c + 1]) - f64::from(points[a + 1]))
        - (f64::from(points[c]) - f64::from(points[a]))
            * (f64::from(points[b + 1]) - f64::from(points[a + 1]))
}

impl CullTriangles {
    pub(super) fn new(
        device: &wgpu::Device,
        parts: &[Part],
        indices: &[u32],
        rest: &[f32],
    ) -> Option<Self> {
        let limits = device.limits();
        let triangles = indices.len() / 3;
        let workgroups = u32::try_from(triangles).ok()?.div_ceil(WORKGROUP_SIZE);
        let largest_binding = (triangles * TRIANGLE_WORDS)
            .max(rest.len())
            .max(parts.len());
        if workgroups == 0
            || workgroups > limits.max_compute_workgroups_per_dimension
            || largest_binding as u64 * 4 > limits.max_storage_buffer_binding_size
            || limits.max_storage_buffers_per_shader_stage < 4
        {
            return None;
        }
        let mut authored = Vec::with_capacity(triangles * TRIANGLE_WORDS);
        for (part, mesh) in parts.iter().enumerate() {
            for triangle in
                indices[mesh.indices.start as usize..mesh.indices.end as usize].chunks_exact(3)
            {
                let facing = determinant(rest, triangle);
                let sign = i32::from(facing > 0.) - i32::from(facing < 0.);
                authored.extend([
                    triangle[0],
                    triangle[1],
                    triangle[2],
                    sign as u32,
                    part as u32,
                ]);
            }
        }
        let authored = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("Authored triangle winding"),
            contents: bytemuck::cast_slice(&authored),
            usage: wgpu::BufferUsages::STORAGE,
        });
        let active = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("Parts requesting winding tests"),
            size: parts.len() as u64 * 4,
            usage: wgpu::BufferUsages::STORAGE | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });
        let shader_source = concat!(
            "/*\n",
            include_str!("../geometry/LICENSE"),
            "\n*/\n",
            include_str!("../geometry/words.wgsl"),
            include_str!("../geometry/float.wgsl"),
            include_str!("winding.wgsl"),
            include_str!("cull.wgsl"),
        );
        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Triangle winding tests"),
            source: wgpu::ShaderSource::Wgsl(shader_source.into()),
        });
        let pipeline = device.create_compute_pipeline(&wgpu::ComputePipelineDescriptor {
            label: Some("Triangle winding tests"),
            layout: None,
            module: &shader,
            entry_point: Some("main"),
            compilation_options: Default::default(),
            cache: None,
        });
        Some(Self {
            pipeline,
            authored,
            active,
            flags: vec![0; parts.len()],
            upload: UploadCache::default(),
            groups: HashMap::new(),
            workgroups,
        })
    }

    pub(super) fn encode(
        &mut self,
        device: &wgpu::Device,
        queue: &wgpu::Queue,
        encoder: &mut wgpu::CommandEncoder,
        display: &[[f32; 13]],
        positions: &wgpu::Buffer,
        output: &wgpu::Buffer,
    ) -> (usize, u32) {
        for (flag, row) in self.flags.iter_mut().zip(display) {
            *flag = u32::from(row[11] >= 0.5);
        }
        let uploads = write_updates(
            queue,
            &self.active,
            &mut self.upload,
            bytemuck::cast_slice(&self.flags),
        );
        let group = self.groups.entry(positions.clone()).or_insert_with(|| {
            let buffers = [positions, &self.authored, &self.active, output];
            let entries: [_; 4] = std::array::from_fn(|binding| wgpu::BindGroupEntry {
                binding: binding as u32,
                resource: buffers[binding].as_entire_binding(),
            });
            device.create_bind_group(&wgpu::BindGroupDescriptor {
                label: Some("Triangle winding buffers"),
                layout: &self.pipeline.get_bind_group_layout(0),
                entries: &entries,
            })
        });
        let mut pass = encoder.begin_compute_pass(&wgpu::ComputePassDescriptor {
            label: Some("Cull flipped triangles"),
            timestamp_writes: None,
        });
        pass.set_pipeline(&self.pipeline);
        pass.set_bind_group(0, &*group, &[]);
        pass.dispatch_workgroups(self.workgroups, 1, 1);
        uploads
    }
}
