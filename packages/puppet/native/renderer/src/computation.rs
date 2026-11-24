//! Geometry and rasterization share one device; owned GPU snapshots survive newer computations.
#[cfg(target_arch = "wasm32")]
use crate::CanvasRenderer;
use crate::{
    geometry::{GeometryKernel, GeometryTarget},
    renderer::Renderer,
};
use std::ops::Range;
#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

fn packed_ranges(
    commands: &[u32],
    coordinates: usize,
) -> Result<Option<Vec<Range<usize>>>, String> {
    let mut ranges = Vec::with_capacity(commands.len() / 4);
    let mut count = 0;
    for job in commands.chunks_exact(4) {
        let start = u64::from(job[0]) * 2;
        let length = u64::from(job[1]) * 2;
        if start + length > coordinates as u64 {
            return Err("Geometry operation exceeds its buffers".into());
        }
        count += length;
        if count > coordinates as u64 / 2 {
            return Ok(None);
        }
        ranges.push(start as usize..(start + length) as usize);
    }
    Ok(Some(ranges))
}

fn copy_positions(source: &[f32], ranges: Option<&[Range<usize>]>) -> Vec<f32> {
    let Some(ranges) = ranges else {
        return source.to_vec();
    };
    let mut packed = Vec::with_capacity(ranges.iter().map(Range::len).sum());
    for range in ranges {
        packed.extend_from_slice(&source[range.clone()]);
    }
    packed
}

struct GeometryImage {
    target: GeometryTarget,
    vertices: Vec<f32>,
}
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub struct GeometryFinisher {
    inner: poffo_runtime::GeometryFinalizer,
}
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
impl GeometryFinisher {
    #[wasm_bindgen(constructor)]
    pub fn new(layout: &[f64]) -> Result<GeometryFinisher, JsValue> {
        Ok(Self {
            inner: poffo_runtime::GeometryFinalizer::new(layout)
                .map_err(|e| JsValue::from_str(&e))?,
        })
    }
}
pub(crate) struct ResidentGeometry {
    kernel: GeometryKernel,
    frames: std::collections::HashMap<u32, GeometryImage>,
    buffers: Vec<GeometryTarget>,
}

pub(crate) struct GeometryFeedback {
    pub(crate) coordinates: Vec<f32>,
    #[cfg(any(target_os = "macos", windows))]
    pub(crate) ranges: Option<Vec<Range<usize>>>,
}

impl ResidentGeometry {
    pub(crate) async fn new(gpu: &Renderer) -> Result<Self, String> {
        Ok(Self {
            kernel: GeometryKernel::on_device(gpu.device.clone(), gpu.queue.clone()).await?,
            frames: Default::default(),
            buffers: Vec::new(),
        })
    }

    #[allow(clippy::too_many_arguments)]
    pub(crate) async fn prepare(
        &mut self,
        gpu: &Renderer,
        id: u32,
        source: Vec<f32>,
        commands: Vec<u32>,
        values: Vec<f32>,
        plan: &[f64],
        finisher: &mut poffo_runtime::GeometryFinalizer,
        is_cancelled: impl FnOnce() -> Result<bool, String>,
    ) -> Result<Option<GeometryFeedback>, String> {
        const CAPACITY: usize = 16;
        if self.frames.len() >= CAPACITY
            || self.frames.contains_key(&id)
            || source.len() as u64 * 4 != gpu.positions.size()
        {
            return Err("Invalid resident geometry frame".into());
        }
        let kernel = &mut self.kernel;
        let mut target = self.buffers.pop().unwrap_or_else(|| {
            GeometryTarget::new(
                &gpu.device,
                gpu.positions.size(),
                "Owned computed frame",
                wgpu::BufferUsages::VERTEX,
            )
        });
        let packed = packed_ranges(&commands, source.len())?;
        let ranges = packed.as_deref();
        let original = copy_positions(&source, ranges);
        let Some(mut vertices) = kernel
            .evaluate_on(source, commands, values, Some(&mut target), is_cancelled)
            .await?
        else {
            self.buffers.push(target);
            return Ok(None);
        };
        let indices = kernel.corrections();
        let all = kernel.overflow();
        match ranges {
            Some(ranges) => {
                finisher.correct_packed(plan, &original, ranges, &mut vertices, &indices, all)
            }
            None => finisher.correct(plan, &original, &mut vertices, &indices, all),
        }?;
        let cached = copy_positions(&vertices, ranges);
        finisher.join(&mut vertices)?;
        // Compute has already written the owned draw buffer. Enqueue only the corrections
        // and Glue updates on the same queue before drawing.
        kernel.commit(&target, &vertices);
        self.frames.insert(id, GeometryImage { target, vertices });
        Ok(Some(GeometryFeedback {
            coordinates: cached,
            #[cfg(any(target_os = "macos", windows))]
            ranges: packed,
        }))
    }

    pub(crate) fn coordinates(&self, id: u32) -> Option<&[f32]> {
        self.frames.get(&id).map(|frame| frame.vertices.as_slice())
    }

    pub(crate) fn draw(&self, gpu: &mut Renderer, id: u32, display: &[f32]) -> Result<(), String> {
        let frame = self
            .frames
            .get(&id)
            .ok_or("Unknown resident geometry frame")?;
        gpu.render_geometry(&frame.vertices, display, Some(&frame.target.positions))
    }

    pub(crate) fn release(&mut self, id: u32) {
        if let Some(frame) = self.frames.remove(&id) {
            self.buffers.push(frame.target);
        }
    }

    #[cfg(any(target_os = "macos", windows))]
    pub(crate) fn clear(&mut self) {
        self.buffers
            .extend(self.frames.drain().map(|(_, frame)| frame.target));
    }
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
impl CanvasRenderer {
    pub async fn enable_geometry(&mut self) -> Result<(), JsValue> {
        if self.geometry.is_none() {
            self.geometry = Some(
                ResidentGeometry::new(&self.gpu)
                    .await
                    .map_err(|e| JsValue::from_str(&e))?,
            );
        }
        Ok(())
    }

    #[allow(clippy::too_many_arguments)]
    pub async fn prepare_geometry(
        &mut self,
        id: u32,
        source: Vec<f32>,
        commands: Vec<u32>,
        values: Vec<f32>,
        plan: Vec<f64>,
        finisher: &mut GeometryFinisher,
        is_cancelled: &js_sys::Function,
    ) -> Result<Option<Vec<f32>>, JsValue> {
        self.geometry
            .as_mut()
            .ok_or_else(|| JsValue::from_str("Shared geometry is not initialized"))?
            .prepare(
                &self.gpu,
                id,
                source,
                commands,
                values,
                &plan,
                &mut finisher.inner,
                || {
                    is_cancelled
                        .call0(&JsValue::UNDEFINED)
                        .map(|value| value.as_bool() == Some(true))
                        .map_err(|error| {
                            error
                                .as_string()
                                .unwrap_or_else(|| "Geometry cancellation failed".into())
                        })
                },
            )
            .await
            .map(|feedback| feedback.map(|feedback| feedback.coordinates))
            .map_err(|error| JsValue::from_str(&error))
    }

    pub fn draw_geometry(
        &mut self,
        id: u32,
        display: &[f32],
    ) -> Result<js_sys::Float32Array, JsValue> {
        let geometry = self
            .geometry
            .as_ref()
            .ok_or_else(|| JsValue::from_str("Shared geometry is not initialized"))?;
        geometry
            .draw(&mut self.gpu, id, display)
            .map_err(|error| JsValue::from_str(&error))?;
        Ok(js_sys::Float32Array::from(
            geometry.coordinates(id).unwrap(),
        ))
    }

    pub fn release_geometry(&mut self, id: u32) {
        if let Some(geometry) = &mut self.geometry {
            geometry.release(id);
        }
    }
}
