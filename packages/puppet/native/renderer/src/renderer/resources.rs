//! GPU texture targets, bindings and pipeline descriptors.

use super::{FORMAT, Renderer};

pub(super) struct Target {
    pub(super) width: u32,
    pub(super) height: u32,
    pub(super) _texture: wgpu::Texture,
    pub(super) view: wgpu::TextureView,
    pub(super) group: wgpu::BindGroup,
    pub(super) multisampled: Option<wgpu::TextureView>,
}
pub(super) fn texture_layout(device: &wgpu::Device) -> wgpu::BindGroupLayout {
    device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
        label: Some("sampled texture"),
        entries: &[
            wgpu::BindGroupLayoutEntry {
                binding: 0,
                visibility: wgpu::ShaderStages::FRAGMENT,
                ty: wgpu::BindingType::Texture {
                    sample_type: wgpu::TextureSampleType::Float { filterable: true },
                    view_dimension: wgpu::TextureViewDimension::D2,
                    multisampled: false,
                },
                count: None,
            },
            wgpu::BindGroupLayoutEntry {
                binding: 1,
                visibility: wgpu::ShaderStages::FRAGMENT,
                ty: wgpu::BindingType::Sampler(wgpu::SamplerBindingType::Filtering),
                count: None,
            },
        ],
    })
}
pub(super) fn group(
    device: &wgpu::Device,
    layout: &wgpu::BindGroupLayout,
    view: &wgpu::TextureView,
    sampler: &wgpu::Sampler,
) -> wgpu::BindGroup {
    device.create_bind_group(&wgpu::BindGroupDescriptor {
        label: Some("texture binding"),
        layout,
        entries: &[
            wgpu::BindGroupEntry {
                binding: 0,
                resource: wgpu::BindingResource::TextureView(view),
            },
            wgpu::BindGroupEntry {
                binding: 1,
                resource: wgpu::BindingResource::Sampler(sampler),
            },
        ],
    })
}
pub(super) fn target(
    device: &wgpu::Device,
    layout: &wgpu::BindGroupLayout,
    sampler: &wgpu::Sampler,
    width: u32,
    height: u32,
    mips: u32,
    samples: u32,
) -> Target {
    color_target(
        device,
        (layout, sampler),
        [width, height],
        FORMAT,
        mips,
        samples,
    )
}

pub(super) fn color_target(
    device: &wgpu::Device,
    (layout, sampler): (&wgpu::BindGroupLayout, &wgpu::Sampler),
    [width, height]: [u32; 2],
    format: wgpu::TextureFormat,
    mips: u32,
    samples: u32,
) -> Target {
    let texture = device.create_texture(&wgpu::TextureDescriptor {
        label: Some("GPU-only color target"),
        size: wgpu::Extent3d {
            width,
            height,
            depth_or_array_layers: 1,
        },
        mip_level_count: mips,
        sample_count: 1,
        dimension: wgpu::TextureDimension::D2,
        format,
        usage: wgpu::TextureUsages::RENDER_ATTACHMENT
            | wgpu::TextureUsages::TEXTURE_BINDING
            | wgpu::TextureUsages::COPY_DST,
        view_formats: &[],
    });
    let view = texture.create_view(&Default::default());
    let binding = group(device, layout, &view, sampler);
    Target {
        width,
        height,
        multisampled: multisampled_target(device, format, width, height, samples),
        _texture: texture,
        view,
        group: binding,
    }
}

pub(super) fn multisampled_target(
    device: &wgpu::Device,
    format: wgpu::TextureFormat,
    width: u32,
    height: u32,
    samples: u32,
) -> Option<wgpu::TextureView> {
    (samples > 1).then(|| {
        let texture = device.create_texture(&wgpu::TextureDescriptor {
            label: Some("multisampled color"),
            size: wgpu::Extent3d {
                width,
                height,
                depth_or_array_layers: 1,
            },
            mip_level_count: 1,
            sample_count: samples,
            dimension: wgpu::TextureDimension::D2,
            format,
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT,
            view_formats: &[],
        });
        texture.create_view(&Default::default())
    })
}
pub(super) fn pipeline(
    device: &wgpu::Device,
    shader: &wgpu::ShaderModule,
    layout: &wgpu::PipelineLayout,
    format: wgpu::TextureFormat,
    blend: Option<wgpu::BlendState>,
    mesh: bool,
    samples: u32,
) -> wgpu::RenderPipeline {
    let position = [wgpu::VertexAttribute {
        format: wgpu::VertexFormat::Float32x2,
        offset: 0,
        shader_location: 0,
    }];
    let uv = [wgpu::VertexAttribute {
        format: wgpu::VertexFormat::Float32x2,
        offset: 0,
        shader_location: 1,
    }];
    let buffers = [
        wgpu::VertexBufferLayout {
            array_stride: 8,
            step_mode: wgpu::VertexStepMode::Vertex,
            attributes: &position,
        },
        wgpu::VertexBufferLayout {
            array_stride: 8,
            step_mode: wgpu::VertexStepMode::Vertex,
            attributes: &uv,
        },
    ];
    device.create_render_pipeline(&wgpu::RenderPipelineDescriptor {
        label: Some("character GPU pipeline"),
        layout: Some(layout),
        vertex: wgpu::VertexState {
            module: shader,
            entry_point: Some("vertex"),
            compilation_options: Default::default(),
            buffers: if mesh { &buffers } else { &[] },
        },
        primitive: Default::default(),
        depth_stencil: None,
        multisample: wgpu::MultisampleState {
            count: samples,
            ..Default::default()
        },
        fragment: Some(wgpu::FragmentState {
            module: shader,
            entry_point: Some("fragment"),
            compilation_options: Default::default(),
            targets: &[Some(wgpu::ColorTargetState {
                format,
                blend,
                write_mask: wgpu::ColorWrites::ALL,
            })],
        }),
        multiview_mask: None,
        cache: None,
    })
}

impl Renderer {
    #[cfg(target_arch = "wasm32")]
    pub fn upload(&mut self, image: web_sys::ImageBitmap) {
        let width = image.width();
        let height = image.height();
        let texture = self.texture_target(width, height);
        self.queue.copy_external_image_to_texture(
            &wgpu::CopyExternalImageSourceInfo {
                source: wgpu::ExternalImageSource::ImageBitmap(image),
                origin: wgpu::Origin2d::ZERO,
                flip_y: false,
            },
            wgpu::CopyExternalImageDestInfo {
                texture: &texture._texture,
                mip_level: 0,
                origin: Default::default(),
                aspect: wgpu::TextureAspect::All,
                color_space: wgpu::PredefinedColorSpace::Srgb,
                premultiplied_alpha: true,
            },
            wgpu::Extent3d {
                width,
                height,
                depth_or_array_layers: 1,
            },
        );
        self.upload_mipmaps(texture, width, height);
    }

    #[cfg(any(target_os = "macos", windows))]
    pub(crate) fn upload_rgba(
        &mut self,
        width: u32,
        height: u32,
        rgba: &[u8],
    ) -> Result<(), String> {
        if width == 0
            || height == 0
            || width.max(height) > self.device.limits().max_texture_dimension_2d
            || rgba.len() as u64 != u64::from(width) * u64::from(height) * 4
        {
            return Err("Invalid native texture dimensions".into());
        }
        let texture = self.texture_target(width, height);
        self.queue.write_texture(
            wgpu::TexelCopyTextureInfo {
                texture: &texture._texture,
                mip_level: 0,
                origin: wgpu::Origin3d::ZERO,
                aspect: wgpu::TextureAspect::All,
            },
            rgba,
            wgpu::TexelCopyBufferLayout {
                offset: 0,
                bytes_per_row: Some(width * 4),
                rows_per_image: Some(height),
            },
            wgpu::Extent3d {
                width,
                height,
                depth_or_array_layers: 1,
            },
        );
        self.upload_mipmaps(texture, width, height);
        Ok(())
    }

    fn texture_target(&self, width: u32, height: u32) -> Target {
        let levels = width.max(height).ilog2() + 1;
        target(
            &self.device,
            &self.texture_layout,
            &self.sampler,
            width,
            height,
            levels,
            1,
        )
    }

    fn upload_mipmaps(&mut self, texture: Target, width: u32, height: u32) {
        let levels = width.max(height).ilog2() + 1;
        let mut encoder = self.device.create_command_encoder(&Default::default());
        for level in 1..levels {
            let source = texture._texture.create_view(&wgpu::TextureViewDescriptor {
                base_mip_level: level - 1,
                mip_level_count: Some(1),
                ..Default::default()
            });
            let destination = texture._texture.create_view(&wgpu::TextureViewDescriptor {
                base_mip_level: level,
                mip_level_count: Some(1),
                ..Default::default()
            });
            let binding = group(&self.device, &self.texture_layout, &source, &self.sampler);
            let attachments = [Some(wgpu::RenderPassColorAttachment {
                view: &destination,
                depth_slice: None,
                resolve_target: None,
                ops: wgpu::Operations {
                    load: wgpu::LoadOp::Clear(wgpu::Color::TRANSPARENT),
                    store: wgpu::StoreOp::Store,
                },
            })];
            let mut pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                color_attachments: &attachments,
                ..Default::default()
            });
            pass.set_pipeline(&self.mipmap);
            pass.set_bind_group(0, &binding, &[]);
            pass.draw(0..3, 0..1);
        }
        self.queue.submit([encoder.finish()]);
        self.textures.push(texture);
    }
}
