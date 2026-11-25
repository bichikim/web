//! Platform surfaces share the browser renderer's geometry and compositing passes.

use crate::{computation::ResidentGeometry, renderer::Renderer};
use poffo_runtime::{BlendMode, GeometryFinalizer, PartPlan, WorkerRuntime};
#[cfg(target_os = "macos")]
use std::ffi::c_void;

/// Owns playback geometry and rasterization on one native GPU device.
pub struct NativeRenderer {
    geometry: ResidentGeometry,
    finisher: Option<GeometryFinalizer>,
    gpu: Renderer,
    display: Vec<f32>,
}

/// An alpha sample whose rendering commands are already queued.
pub struct AlphaReadback {
    device: wgpu::Device,
    buffer: wgpu::Buffer,
}

impl AlphaReadback {
    pub async fn read(self) -> Result<Vec<u8>, String> {
        Renderer::read_alpha(&self.device, self.buffer).await
    }
}

fn pack_display(display: &mut Vec<f32>, parts: &[PartPlan]) {
    display.clear();
    for part in parts {
        let properties = part.properties;
        let multiply = properties.multiply_color.map(|value| value as f32);
        let screen = properties.screen_color.map(|value| value as f32);
        display.extend([
            part.part as f32,
            u8::from(part.visible).into(),
            u8::from(part.render).into(),
            properties.opacity as f32,
            multiply[0],
            multiply[1],
            multiply[2],
            screen[0],
            screen[1],
            screen[2],
            u8::from(properties.inverted_mask).into(),
            u8::from(properties.culling).into(),
            u8::from(properties.blend_mode == BlendMode::MultiplyCompatible).into(),
        ]);
    }
}

impl NativeRenderer {
    #[cfg(target_os = "macos")]
    /// # Safety
    /// The pointer must identify a live CAMetalLayer retained by the host through this call.
    pub async unsafe fn from_metal_layer(
        layer: *mut c_void,
        size: [u32; 2],
        metadata: &str,
    ) -> Result<Self, String> {
        let instance = wgpu::Instance::new(wgpu::InstanceDescriptor {
            backends: wgpu::Backends::METAL,
            ..wgpu::InstanceDescriptor::new_without_display_handle()
        });
        // The Metal surface retains its own reference to the caller's live layer.
        let surface = unsafe {
            instance.create_surface_unsafe(wgpu::SurfaceTargetUnsafe::CoreAnimationLayer(layer))
        }
        .map_err(|error| error.to_string())?;
        Self::for_surface(instance, surface, size, metadata).await
    }

    #[cfg(windows)]
    pub async fn from_dx12_window(
        window: impl Into<wgpu::SurfaceTarget<'static>>,
        size: [u32; 2],
        metadata: &str,
    ) -> Result<Self, String> {
        let mut descriptor = wgpu::InstanceDescriptor::new_without_display_handle();
        descriptor.backends = wgpu::Backends::DX12;
        descriptor.backend_options.dx12.presentation_system =
            wgpu::Dx12SwapchainKind::DxgiFromVisual;
        let instance = wgpu::Instance::new(descriptor);
        let surface = instance
            .create_surface(window)
            .map_err(|error| error.to_string())?;
        Self::for_surface(instance, surface, size, metadata).await
    }

    async fn for_surface(
        instance: wgpu::Instance,
        surface: wgpu::Surface<'static>,
        size: [u32; 2],
        metadata: &str,
    ) -> Result<Self, String> {
        let gpu =
            Renderer::for_surface(instance, surface, size[0], size[1], metadata, 4, true).await?;
        Ok(Self {
            geometry: ResidentGeometry::new(&gpu).await?,
            finisher: None,
            gpu,
            display: Vec::new(),
        })
    }

    pub fn upload_premultiplied_rgba(&mut self, size: [u32; 2], rgba: &[u8]) -> Result<(), String> {
        self.gpu.upload_rgba(size[0], size[1], rgba)
    }

    pub fn reset_playback(&mut self) {
        self.geometry.clear();
        self.finisher = None;
    }

    /// Evaluates the authored GPU jobs, corrects rounding, and joins glued meshes.
    pub async fn prepare(&mut self, runtime: &mut WorkerRuntime) -> Result<Option<u32>, String> {
        if !runtime.geometry_pending() {
            return Ok(None);
        }
        if self.finisher.is_none() {
            self.finisher = Some(GeometryFinalizer::new(runtime.geometry_layout())?);
        }
        let commands = runtime.geometry_commands().to_vec();
        let values = runtime.geometry_values().to_vec();
        let id = runtime.take_geometry().map_err(|error| error.to_string())?;
        let plan = runtime
            .geometry_packet(id)
            .ok_or("Missing native geometry plan")?;
        let source = runtime
            .geometry_output(id)
            .ok_or("Missing native geometry source")?;
        let result = self
            .geometry
            .prepare(
                &self.gpu,
                id,
                source.to_vec(),
                commands,
                values,
                plan,
                self.finisher.as_mut().unwrap(),
                || Ok(false),
            )
            .await;
        let feedback = match result {
            Ok(Some(feedback)) => feedback,
            Ok(None) => return Err("Native geometry was cancelled".into()),
            Err(error) => {
                let _ = runtime.cache_geometry(id, true);
                return Err(error);
            }
        };
        let target = runtime
            .geometry_input(id)
            .ok_or("Missing native geometry feedback buffer")?;
        if let Some(ranges) = feedback.ranges {
            let mut offset = 0;
            for range in ranges {
                let end = offset + range.len();
                target[range].copy_from_slice(&feedback.coordinates[offset..end]);
                offset = end;
            }
        } else {
            target.copy_from_slice(&feedback.coordinates);
        }
        runtime
            .cache_geometry(id, false)
            .map_err(|error| error.to_string())?;
        Ok(Some(id))
    }

    pub fn coordinates(&self, frame: u32) -> Option<&[f32]> {
        self.geometry.coordinates(frame)
    }

    pub fn release(&mut self, frame: u32) {
        self.geometry.release(frame);
    }

    /// Draws the runtime's current paint order without serializing it through the WebView.
    pub fn draw_playback(
        &mut self,
        size: [u32; 2],
        view: [f32; 4],
        frame: Option<u32>,
        coordinates: &[f32],
        parts: &[PartPlan],
        alpha: Option<[u32; 2]>,
    ) -> Result<Option<AlphaReadback>, String> {
        let mut display = std::mem::take(&mut self.display);
        pack_display(&mut display, parts);
        let result = self.draw(size, view, frame, coordinates, &display, alpha);
        self.display = display;
        result
    }

    /// Submits the selected resident frame or a coordinate-only fallback.
    pub async fn present(
        &mut self,
        size: [u32; 2],
        view: [f32; 4],
        frame: Option<u32>,
        coordinates: &[f32],
        display: &[f32],
        alpha: Option<[u32; 2]>,
    ) -> Result<Vec<u8>, String> {
        match self.draw(size, view, frame, coordinates, display, alpha)? {
            Some(readback) => readback.read().await,
            None => Ok(Vec::new()),
        }
    }

    fn draw(
        &mut self,
        size: [u32; 2],
        view: [f32; 4],
        frame: Option<u32>,
        coordinates: &[f32],
        display: &[f32],
        alpha: Option<[u32; 2]>,
    ) -> Result<Option<AlphaReadback>, String> {
        self.gpu.resize(size[0], size[1]);
        self.gpu.view(view);
        if let Some([width, height]) = alpha {
            self.gpu.request_alpha(width, height);
        }
        match frame {
            Some(frame) => self.geometry.draw(&mut self.gpu, frame, display)?,
            None => self.gpu.render(coordinates, display)?,
        }
        Ok(self.gpu.alpha_buffer().map(|buffer| AlphaReadback {
            device: self.gpu.device.clone(),
            buffer,
        }))
    }
}
