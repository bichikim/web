//! Renderer lifetime: device initialization, texture upload, camera and resize.

mod alpha;
mod batch;
mod cull;
mod frame;
mod resources;
mod scene;

use crate::upload::UploadCache;
use resources::{Target, multisampled_target, pipeline, target, texture_layout};
use scene::{Mask, Metadata, Part, collect_mask};

use std::{
    collections::{HashMap, HashSet},
    num::NonZeroU64,
};
#[cfg(target_arch = "wasm32")]
use wasm_bindgen::{JsCast, JsValue};
use wgpu::util::DeviceExt;

const FORMAT: wgpu::TextureFormat = wgpu::TextureFormat::Rgba8Unorm;
const STRIDE: usize = 256;
pub struct Renderer {
    pub(crate) device: wgpu::Device,
    pub(crate) queue: wgpu::Queue,
    surface: wgpu::Surface<'static>,
    normal: wgpu::RenderPipeline,
    multiply: wgpu::RenderPipeline,
    mask_pipeline: Option<wgpu::RenderPipeline>,
    mipmap: wgpu::RenderPipeline,
    uniform: wgpu::Buffer,
    uniform_group: wgpu::BindGroup,
    texture_layout: wgpu::BindGroupLayout,
    sampler: wgpu::Sampler,
    pub(crate) positions: wgpu::Buffer,
    uvs: wgpu::Buffer,
    indices: wgpu::Buffer,
    mask_indices: wgpu::Buffer,
    rest: Vec<f32>,
    rest_indices: Vec<u32>,
    index_data: Vec<u32>,
    cull: Option<cull::CullTriangles>,
    uniform_data: Vec<u8>,
    pub(crate) position_upload: UploadCache,
    index_upload: UploadCache,
    uniform_upload: UploadCache,
    parts: Vec<Part>,
    masks: Vec<Mask>,
    textures: Vec<Target>,
    empty: Target,
    multisampled_output: Option<wgpu::TextureView>,
    alpha_target: Option<Target>,
    surface_blit: Option<wgpu::RenderPipeline>,
    width: u32,
    height: u32,
    camera: [f32; 4],
    display: Vec<[f32; 13]>,
    #[cfg(target_arch = "wasm32")]
    adapter: String,
    draws: u32,
    mask_passes: u32,
    batches: u32,
    upload_bytes: usize,
    upload_calls: u32,
    config: wgpu::SurfaceConfiguration,
    samples: u32,
    alpha_sampler: Option<alpha::AlphaSampler>,
    alpha_size: Option<[u32; 2]>,
    alpha_readback: Option<wgpu::Buffer>,
}
impl Renderer {
    #[cfg(target_arch = "wasm32")]
    pub async fn new(
        canvas: JsValue,
        width: u32,
        height: u32,
        json: &str,
        samples: u32,
        alpha_capture: bool,
    ) -> Result<Self, String> {
        let instance = wgpu::Instance::new(wgpu::InstanceDescriptor {
            backends: wgpu::Backends::BROWSER_WEBGPU,
            ..wgpu::InstanceDescriptor::new_without_display_handle()
        });
        let surface = instance
            .create_surface(
                if let Ok(offscreen) = canvas.clone().dyn_into::<web_sys::OffscreenCanvas>() {
                    wgpu::SurfaceTarget::OffscreenCanvas(offscreen)
                } else {
                    wgpu::SurfaceTarget::Canvas(canvas.dyn_into().map_err(|_| "Canvas type")?)
                },
            )
            .map_err(|e| e.to_string())?;
        Self::for_surface(
            instance,
            surface,
            width,
            height,
            json,
            samples,
            alpha_capture,
        )
        .await
    }

    pub(crate) async fn for_surface(
        instance: wgpu::Instance,
        surface: wgpu::Surface<'static>,
        width: u32,
        height: u32,
        json: &str,
        samples: u32,
        alpha_capture: bool,
    ) -> Result<Self, String> {
        let metadata: Metadata = serde_json::from_str(json).map_err(|e| e.to_string())?;
        for plan in &metadata.plans {
            let properties = &plan["properties"];
            if !matches!(
                properties["blendMode"].as_str(),
                Some("normal" | "multiply-compatible")
            ) || properties["alphaBlendMode"] != "over"
                || plan["layerIds"]
                    .as_array()
                    .is_some_and(|layers| !layers.is_empty())
            {
                return Err("Unsupported wgpu render properties".into());
            }
        }
        let adapter = instance
            .request_adapter(&wgpu::RequestAdapterOptions {
                power_preference: wgpu::PowerPreference::HighPerformance,
                compatible_surface: Some(&surface),
                force_fallback_adapter: false,
            })
            .await
            .map_err(|e| e.to_string())?;
        #[cfg(target_arch = "wasm32")]
        let info = adapter.get_info();
        #[cfg(target_arch = "wasm32")]
        let adapter_info = format!("{:?}: {} ({:?})", info.backend, info.name, info.device_type);
        let (device, queue) = adapter
            .request_device(&wgpu::DeviceDescriptor {
                label: Some("Poffo GPU renderer"),
                required_limits: wgpu::Limits::downlevel_defaults()
                    .using_resolution(adapter.limits()),
                ..Default::default()
            })
            .await
            .map_err(|e| e.to_string())?;
        let caps = surface.get_capabilities(&adapter);
        let mut config = surface
            .get_default_config(&adapter, width, height)
            .ok_or("surface configuration")?;
        config.format = *caps
            .formats
            .iter()
            .find(|f| !f.is_srgb())
            .unwrap_or(&config.format); // The pinned browser backend explicitly maps PreMultiplied to GPUCanvasAlphaMode::Premultiplied.
        #[cfg(target_arch = "wasm32")]
        {
            config.alpha_mode = wgpu::CompositeAlphaMode::PreMultiplied;
        }
        #[cfg(target_os = "macos")]
        {
            // wgpu's Metal backend uses this mode to make CAMetalLayer non-opaque.
            // Its presentation path leaves our premultiplied pixel values intact.
            config.alpha_mode = wgpu::CompositeAlphaMode::PostMultiplied;
            if !caps.alpha_modes.contains(&config.alpha_mode) {
                return Err("Metal surface does not support transparency".into());
            }
        }
        #[cfg(windows)]
        {
            config.alpha_mode = wgpu::CompositeAlphaMode::PreMultiplied;
            if !caps.alpha_modes.contains(&config.alpha_mode) {
                return Err("DirectX 12 surface does not support transparency".into());
            }
        }
        if cfg!(target_arch = "wasm32") && alpha_capture {
            // wgpu's browser backend advertises only RENDER_ATTACHMENT in surface capabilities.
            // GPUCanvasConfiguration can also expose the resolved color texture for sampling.
            config.usage |= wgpu::TextureUsages::TEXTURE_BINDING;
        }
        surface.configure(&device, &config);
        let sampled = texture_layout(&device);
        let sampler = device.create_sampler(&wgpu::SamplerDescriptor {
            label: Some("linear mipmaps"),
            mag_filter: wgpu::FilterMode::Linear,
            min_filter: wgpu::FilterMode::Linear,
            mipmap_filter: wgpu::MipmapFilterMode::Linear,
            ..Default::default()
        });
        let uniform_layout = device.create_bind_group_layout(&wgpu::BindGroupLayoutDescriptor {
            label: Some("per draw uniforms"),
            entries: &[wgpu::BindGroupLayoutEntry {
                binding: 0,
                visibility: wgpu::ShaderStages::VERTEX_FRAGMENT,
                ty: wgpu::BindingType::Buffer {
                    ty: wgpu::BufferBindingType::Uniform,
                    has_dynamic_offset: true,
                    min_binding_size: NonZeroU64::new(96),
                },
                count: None,
            }],
        });
        let layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: None,
            bind_group_layouts: &[Some(&uniform_layout), Some(&sampled), Some(&sampled)],
            immediate_size: 0,
        });
        let shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Poffo mesh and alpha masks"),
            source: wgpu::ShaderSource::Wgsl(include_str!("part.wgsl").into()),
        });
        let normal = pipeline(
            &device,
            &shader,
            &layout,
            config.format,
            Some(wgpu::BlendState::PREMULTIPLIED_ALPHA_BLENDING),
            true,
            samples,
        );
        let mask_pipeline = (config.format != FORMAT).then(|| {
            pipeline(
                &device,
                &shader,
                &layout,
                FORMAT,
                Some(wgpu::BlendState::PREMULTIPLIED_ALPHA_BLENDING),
                true,
                samples,
            )
        });
        let multiply = pipeline(
            &device,
            &shader,
            &layout,
            config.format,
            Some(wgpu::BlendState {
                color: wgpu::BlendComponent {
                    src_factor: wgpu::BlendFactor::Dst,
                    dst_factor: wgpu::BlendFactor::OneMinusSrcAlpha,
                    operation: wgpu::BlendOperation::Add,
                },
                alpha: wgpu::BlendComponent {
                    src_factor: wgpu::BlendFactor::Zero,
                    dst_factor: wgpu::BlendFactor::One,
                    operation: wgpu::BlendOperation::Add,
                },
            }),
            true,
            samples,
        );
        let blit_shader = device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("GPU texture presentation"),
            source: wgpu::ShaderSource::Wgsl(include_str!("blit.wgsl").into()),
        });
        let blit_layout = device.create_pipeline_layout(&wgpu::PipelineLayoutDescriptor {
            label: None,
            bind_group_layouts: &[Some(&sampled)],
            immediate_size: 0,
        });
        let mipmap = pipeline(&device, &blit_shader, &blit_layout, FORMAT, None, false, 1);
        let surface_blit = (alpha_capture
            && !config.usage.contains(wgpu::TextureUsages::TEXTURE_BINDING))
        .then(|| {
            pipeline(
                &device,
                &blit_shader,
                &blit_layout,
                config.format,
                None,
                false,
                1,
            )
        });
        let ids: HashMap<_, _> = metadata
            .parts
            .iter()
            .enumerate()
            .map(|(index, part)| (part.id.clone(), index))
            .collect();
        let mut masks = vec![];
        let mut mask_cache = HashMap::new();
        let plan_by_id: HashMap<_, _> = metadata
            .plans
            .iter()
            .map(|plan| (plan["partId"].as_str().unwrap(), plan))
            .collect();
        let mut rest = vec![];
        let mut uvs: Vec<f32> = vec![];
        let mut indices = vec![];
        let mut parts = vec![];
        for mesh in &metadata.parts {
            let plan = plan_by_id[mesh.id.as_str()];
            let vertex_start = rest.len();
            let first = indices.len() as u32;
            let base = (vertex_start / 2) as u32;
            indices.extend(mesh.indices.iter().map(|index| index + base));
            parts.push(Part {
                indices: first..indices.len() as u32,
                texture: mesh.texture,
                mask: collect_mask(&plan["mask"], &ids, &mut mask_cache, &mut masks),
            });
            rest.extend(&mesh.vertices);
            uvs.extend(&mesh.uvs);
        }
        let capacity = metadata.parts.len() + masks.iter().map(|m| m.sources.len()).sum::<usize>();
        let uniform = device.create_buffer(&wgpu::BufferDescriptor {
            label: Some("packed draw data"),
            size: ((capacity + 1) * STRIDE) as u64,
            usage: wgpu::BufferUsages::UNIFORM | wgpu::BufferUsages::COPY_DST,
            mapped_at_creation: false,
        });
        let uniform_group = device.create_bind_group(&wgpu::BindGroupDescriptor {
            label: None,
            layout: &uniform_layout,
            entries: &[wgpu::BindGroupEntry {
                binding: 0,
                resource: wgpu::BindingResource::Buffer(wgpu::BufferBinding {
                    buffer: &uniform,
                    offset: 0,
                    size: NonZeroU64::new(96),
                }),
            }],
        });
        let positions = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("deformed positions"),
            contents: bytemuck::cast_slice(&rest),
            usage: wgpu::BufferUsages::VERTEX
                | wgpu::BufferUsages::COPY_DST
                | wgpu::BufferUsages::COPY_SRC
                | wgpu::BufferUsages::STORAGE,
        });
        let uv_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("static UVs"),
            contents: bytemuck::cast_slice(&uvs),
            usage: wgpu::BufferUsages::VERTEX,
        });
        let cull = cull::CullTriangles::new(&device, &parts, &indices, &rest);
        let index_storage = if cull.is_some() {
            wgpu::BufferUsages::STORAGE
        } else {
            wgpu::BufferUsages::empty()
        };
        let index_buffer = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("triangle indices"),
            contents: bytemuck::cast_slice(&indices),
            usage: wgpu::BufferUsages::INDEX | wgpu::BufferUsages::COPY_DST | index_storage,
        });
        let mask_indices = device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
            label: Some("mask triangle indices"),
            contents: bytemuck::cast_slice(&indices),
            usage: wgpu::BufferUsages::INDEX,
        });
        let empty = target(&device, &sampled, &sampler, 1, 1, 1, 1);
        queue.write_texture(
            wgpu::TexelCopyTextureInfo {
                texture: &empty._texture,
                mip_level: 0,
                origin: Default::default(),
                aspect: wgpu::TextureAspect::All,
            },
            &[0, 0, 0, 0],
            wgpu::TexelCopyBufferLayout {
                offset: 0,
                bytes_per_row: Some(4),
                rows_per_image: Some(1),
            },
            wgpu::Extent3d {
                width: 1,
                height: 1,
                depth_or_array_layers: 1,
            },
        );
        let multisampled_output =
            multisampled_target(&device, config.format, width, height, samples);
        let scale =
            (width as f32 / metadata.viewport.width).min(height as f32 / metadata.viewport.height);
        let dx = (width as f32 - metadata.viewport.width * scale) * 0.5;
        let dy = (height as f32 - metadata.viewport.height * scale) * 0.5;
        let camera = [
            2. * scale / width as f32,
            -2. * scale / height as f32,
            2. * dx / width as f32 - 1.,
            1. - 2. * dy / height as f32,
        ];
        for mask in &mut masks {
            let mut seen = HashSet::new();
            mask.vertices = mask
                .sources
                .iter()
                .flat_map(|source| {
                    let range = &parts[source.part].indices;
                    indices[range.start as usize..range.end as usize]
                        .iter()
                        .copied()
                })
                .filter(|index| seen.insert(*index))
                .collect();
        }
        let part_count = parts.len();
        let index_data = indices.clone();
        let index_upload = UploadCache::initialized(bytemuck::cast_slice(&indices));
        let position_upload = UploadCache::initialized(bytemuck::cast_slice(&rest));
        Ok(Self {
            device,
            queue,
            surface,
            normal,
            multiply,
            mask_pipeline,
            mipmap,
            uniform,
            uniform_group,
            texture_layout: sampled,
            sampler,
            positions,
            uvs: uv_buffer,
            indices: index_buffer,
            mask_indices,
            rest,
            rest_indices: indices,
            index_data,
            cull,
            uniform_data: Vec::with_capacity((capacity + 1) * STRIDE),
            position_upload,
            index_upload,
            uniform_upload: UploadCache::default(),
            parts,
            masks,
            textures: vec![],
            empty,
            multisampled_output,
            alpha_target: None,
            surface_blit,
            width,
            height,
            camera,
            display: vec![[0.; 13]; part_count],
            #[cfg(target_arch = "wasm32")]
            adapter: adapter_info,
            draws: 0,
            mask_passes: 0,
            batches: 0,
            upload_bytes: 0,
            upload_calls: 0,
            config,
            samples,
            alpha_sampler: None,
            alpha_size: None,
            alpha_readback: None,
        })
    }
    pub fn request_alpha(&mut self, width: u32, height: u32) {
        self.alpha_size = ((1..=512).contains(&width)
            && (1..=512).contains(&height)
            && (self.surface_blit.is_some()
                || self
                    .config
                    .usage
                    .contains(wgpu::TextureUsages::TEXTURE_BINDING)))
        .then_some([width, height]);
    }
    pub fn alpha_buffer(&mut self) -> Option<wgpu::Buffer> {
        self.alpha_readback.take()
    }
    pub(crate) async fn read_alpha(
        device: &wgpu::Device,
        buffer: wgpu::Buffer,
    ) -> Result<Vec<u8>, String> {
        alpha::read_alpha(device, buffer).await
    }
    pub fn view(&mut self, camera: [f32; 4]) {
        self.camera = camera;
    }
    pub fn resize(&mut self, width: u32, height: u32) {
        if self.width == width && self.height == height {
            return;
        }
        self.width = width;
        self.height = height;
        self.alpha_target = None;
        self.config.width = width;
        self.config.height = height;
        self.surface.configure(&self.device, &self.config);
        self.multisampled_output = multisampled_target(
            &self.device,
            self.config.format,
            width,
            height,
            self.samples,
        );
        for mask in &mut self.masks {
            mask.target = None;
        }
    }
    #[cfg(target_arch = "wasm32")]
    pub fn info(&self) -> String {
        serde_json::json!({"backend":self.adapter,"width":self.width,"height":self.height,"draws":self.draws,"batches":self.batches,"maskPasses":self.mask_passes,"uploadBytes":self.upload_bytes,"uploadCalls":self.upload_calls,"readback":false,"presentation":"wgpu GPU Canvas"}).to_string()
    }
}
