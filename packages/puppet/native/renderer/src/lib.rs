#[cfg(any(test, target_arch = "wasm32", target_os = "macos", windows))]
mod bounds;
#[cfg(any(target_arch = "wasm32", target_os = "macos", windows))]
mod computation;
#[cfg(any(target_arch = "wasm32", target_os = "macos", windows))]
mod geometry;
#[cfg(target_arch = "wasm32")]
pub use computation::GeometryFinisher;
#[cfg(any(target_arch = "wasm32", target_os = "macos", windows))]
mod renderer;
#[cfg(target_arch = "wasm32")]
pub use geometry::GeometryKernel;
#[cfg(any(target_os = "macos", windows))]
pub mod native;
#[cfg(any(target_arch = "wasm32", target_os = "macos", windows))]
mod readback;
#[cfg(any(test, target_arch = "wasm32", target_os = "macos", windows))]
mod upload;
#[cfg(target_arch = "wasm32")]
use renderer::Renderer;
#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub struct CanvasRenderer {
    gpu: Renderer,
    geometry: Option<computation::ResidentGeometry>,
}
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
impl CanvasRenderer {
    pub async fn create(
        canvas: JsValue,
        width: u32,
        height: u32,
        metadata: &str,
        samples: u32,
        alpha_capture: Option<bool>,
    ) -> Result<CanvasRenderer, JsValue> {
        Ok(Self {
            geometry: None,
            gpu: Renderer::new(
                canvas,
                width,
                height,
                metadata,
                samples,
                alpha_capture.unwrap_or(false),
            )
            .await
            .map_err(|error| JsValue::from_str(&error))?,
        })
    }
    pub fn texture(&mut self, image: web_sys::ImageBitmap) {
        self.gpu.upload(image);
    }
    pub fn draw(&mut self, vertices: &[f32], display: &[f32]) -> Result<(), JsValue> {
        self.gpu
            .render(vertices, display)
            .map_err(|error| JsValue::from_str(&error))
    }
    pub fn request_alpha(&mut self, width: u32, height: u32) {
        self.gpu.request_alpha(width, height);
    }
    pub fn take_alpha(&mut self) -> Option<js_sys::Promise> {
        let buffer = self.gpu.alpha_buffer()?;
        let device = self.gpu.device.clone();
        Some(wasm_bindgen_futures::future_to_promise(async move {
            let alpha = Renderer::read_alpha(&device, buffer)
                .await
                .map_err(|error| JsValue::from_str(&error))?;
            Ok(js_sys::Uint8Array::from(alpha.as_slice()).into())
        }))
    }
    pub fn resize(&mut self, width: u32, height: u32) {
        self.gpu.resize(width, height);
    }
    pub fn view(&mut self, x: f32, y: f32, dx: f32, dy: f32) {
        self.gpu.view([x, y, dx, dy]);
    }
    pub fn info(&self) -> String {
        self.gpu.info()
    }
}
