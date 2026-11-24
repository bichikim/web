//! Per-frame culling, clipping passes and GPU submission.

use super::{Renderer, STRIDE, batch::DrawCommand, resources::target};
use crate::bounds::{crop_camera, mask_bounds};
use crate::upload::UploadCache;
use std::collections::HashSet;

struct Pass {
    mask: Option<usize>,
    jobs: Vec<DrawCommand>,
}

pub(super) fn write_updates(
    queue: &wgpu::Queue,
    buffer: &wgpu::Buffer,
    cache: &mut UploadCache,
    bytes: &[u8],
) -> (usize, u32) {
    let ranges = cache.update(bytes);
    for range in ranges {
        queue.write_buffer(buffer, range.start as u64, &bytes[range.clone()]);
    }
    (
        ranges.iter().map(|range| range.len()).sum(),
        ranges.len() as u32,
    )
}

#[derive(Clone, Copy)]
enum DrawKind {
    Color,
    Mask,
}

impl Renderer {
    fn required_mask(&self, index: usize, seen: &mut HashSet<usize>, order: &mut Vec<usize>) {
        if !seen.insert(index) {
            return;
        }
        for source in &self.masks[index].sources {
            if let Some(nested) = source.mask {
                self.required_mask(nested, seen, order);
            }
        }
        order.push(index);
    }
    fn job(
        &self,
        part: usize,
        mask: Option<usize>,
        inverted: bool,
        kind: DrawKind,
        bounds: [u32; 4],
        uniforms: &mut Vec<u8>,
    ) -> DrawCommand {
        let state = &self.display[part];
        let (multiply, screen) = match kind {
            DrawKind::Color => (
                [state[4], state[5], state[6], state[3]],
                [state[7], state[8], state[9]],
            ),
            // Clipping uses texture alpha independently of the source's display effects.
            DrawKind::Mask => ([1.; 4], [0.; 3]),
        };
        let camera = crop_camera(self.camera, bounds, self.width, self.height);
        let clip = mask
            .map(|index| self.masks[index].bounds)
            .unwrap_or([0, 0, 1, 1]);
        let values: [f32; 24] = [
            camera[0],
            camera[1],
            camera[2],
            camera[3],
            multiply[0],
            multiply[1],
            multiply[2],
            multiply[3],
            screen[0],
            screen[1],
            screen[2],
            self.width as f32,
            f32::from(mask.is_some()),
            f32::from(inverted),
            0.,
            self.height as f32,
            clip[0] as f32,
            clip[1] as f32,
            clip[2] as f32,
            clip[3] as f32,
            bounds[0] as f32,
            bounds[1] as f32,
            0.,
            0.,
        ];
        let slot = uniforms.len();
        uniforms.resize(slot + STRIDE, 0);
        uniforms[slot..slot + 96].copy_from_slice(bytemuck::cast_slice(&values));
        DrawCommand {
            indices: self.parts[part].indices.clone(),
            slot: slot as u32,
            texture: self.parts[part].texture,
            mask,
            multiply: matches!(kind, DrawKind::Color) && state[12] > 0.5,
        }
    }

    fn cull_on_cpu(&mut self, vertices: &[f32]) {
        self.index_data.copy_from_slice(&self.rest_indices);
        for (index, part) in self.parts.iter().enumerate() {
            if self.display[index][11] < 0.5 {
                continue;
            }
            for offset in (part.indices.start as usize..part.indices.end as usize).step_by(3) {
                let ids = &self.rest_indices[offset..offset + 3];
                use super::cull::determinant;
                if determinant(vertices, ids) * determinant(&self.rest, ids) < 0. {
                    self.index_data[offset + 1] = ids[0];
                    self.index_data[offset + 2] = ids[0];
                }
            }
        }

        let (bytes, calls) = write_updates(
            &self.queue,
            &self.indices,
            &mut self.index_upload,
            bytemuck::cast_slice(&self.index_data),
        );
        self.upload_bytes += bytes;
        self.upload_calls += calls;
    }

    pub fn render(&mut self, vertices: &[f32], display: &[f32]) -> Result<(), String> {
        self.render_geometry(vertices, display, None)
    }
    pub(crate) fn render_geometry(
        &mut self,
        vertices: &[f32],
        display: &[f32],
        resident: Option<&wgpu::Buffer>,
    ) -> Result<(), String> {
        let alpha_size = self.alpha_size.take();
        if vertices.len() != self.rest.len() {
            return Err("vertex count".into());
        }
        if !display.len().is_multiple_of(13) {
            return Err("Incomplete GPU display record".into());
        }
        for row in display.chunks_exact(13) {
            let index = row[0] as usize;
            let part = self
                .display
                .get_mut(index)
                .filter(|_| row[0] == index as f32)
                .ok_or("Invalid GPU display record")?;
            part.copy_from_slice(row);
        }
        (self.upload_bytes, self.upload_calls) = if resident.is_some() {
            (0, 0)
        } else {
            write_updates(
                &self.queue,
                &self.positions,
                &mut self.position_upload,
                bytemuck::cast_slice(vertices),
            )
        };
        let culling = self.display.iter().any(|row| row[11] >= 0.5);
        if culling && self.cull.is_none() {
            self.cull_on_cpu(vertices);
        }
        let mut seen = HashSet::new();
        let mut order = vec![];
        for row in display.chunks_exact(13) {
            let index = row[0] as usize;
            if row[1] > 0.5
                && row[2] > 0.5
                && row[3] > 0.
                && !self.parts[index].indices.is_empty()
                && let Some(mask) = self.parts[index].mask
            {
                self.required_mask(mask, &mut seen, &mut order);
            }
        }
        for index in &order {
            let points = self.masks[*index].vertices.iter().map(|index| {
                [
                    vertices[*index as usize * 2],
                    vertices[*index as usize * 2 + 1],
                ]
            });
            let mut bounds = mask_bounds(points, self.camera, self.width, self.height);
            if let Some(target) = &self.masks[*index].target {
                bounds[2] = bounds[2].max(target.width);
                bounds[3] = bounds[3].max(target.height);
            }
            let capacity =
                |value: u32, limit: u32| value.div_ceil(64).saturating_mul(64).min(limit).max(1);
            bounds[2] = capacity(bounds[2], self.width);
            bounds[3] = capacity(bounds[3], self.height);
            let mask = &mut self.masks[*index];
            mask.bounds = bounds;
            if mask
                .target
                .as_ref()
                .is_none_or(|target| target.width != bounds[2] || target.height != bounds[3])
            {
                mask.target = Some(target(
                    &self.device,
                    &self.texture_layout,
                    &self.sampler,
                    bounds[2],
                    bounds[3],
                    1,
                    self.samples,
                ));
            }
        }
        let mut uniforms = std::mem::take(&mut self.uniform_data);
        uniforms.clear();
        let mut passes = vec![];
        for index in &order {
            let jobs = self.masks[*index]
                .sources
                .iter()
                .filter(|s| !self.parts[s.part].indices.is_empty())
                .map(|s| {
                    self.job(
                        s.part,
                        s.mask,
                        s.inverted,
                        DrawKind::Mask,
                        self.masks[*index].bounds,
                        &mut uniforms,
                    )
                })
                .collect::<Vec<_>>();
            passes.push(Pass {
                mask: Some(*index),
                jobs,
            });
        }
        let jobs = display
            .chunks_exact(13)
            .filter(|r| {
                r[1] > 0.5
                    && r[2] > 0.5
                    && r[3] > 0.
                    && !self.parts[r[0] as usize].indices.is_empty()
            })
            .map(|r| {
                let index = r[0] as usize;
                self.job(
                    index,
                    self.parts[index].mask,
                    r[10] > 0.5,
                    DrawKind::Color,
                    [0, 0, self.width, self.height],
                    &mut uniforms,
                )
            })
            .collect::<Vec<_>>();
        passes.push(Pass { mask: None, jobs });
        self.uniform_data = uniforms;
        let (bytes, calls) = write_updates(
            &self.queue,
            &self.uniform,
            &mut self.uniform_upload,
            &self.uniform_data,
        );
        self.upload_bytes += bytes;
        self.upload_calls += calls;
        let frame = match self.surface.get_current_texture() {
            wgpu::CurrentSurfaceTexture::Success(frame)
            | wgpu::CurrentSurfaceTexture::Suboptimal(frame) => frame,
            other => return Err(format!("Surface acquisition: {other:?}")),
        };
        let surface_view = frame.texture.create_view(&Default::default());
        // CAMetalLayer drawables are render attachments only. A pick request resolves
        // into a sampleable GPU texture and presents that same image through a GPU blit.
        let needs_alpha_target = alpha_size.is_some() && self.surface_blit.is_some();
        if needs_alpha_target {
            self.alpha_target.get_or_insert_with(|| {
                super::resources::color_target(
                    &self.device,
                    (&self.texture_layout, &self.sampler),
                    [self.width, self.height],
                    self.config.format,
                    1,
                    1,
                )
            });
        }
        let alpha_target = self.alpha_target.as_ref().filter(|_| needs_alpha_target);
        let color_view = alpha_target.map_or(&surface_view, |target| &target.view);
        let mut encoder = self.device.create_command_encoder(&Default::default());
        let positions = resident.unwrap_or(&self.positions);
        if culling && let Some(cull) = &mut self.cull {
            let (bytes, calls) = cull.encode(
                &self.device,
                &self.queue,
                &mut encoder,
                &self.display,
                positions,
                &self.indices,
            );
            self.upload_bytes += bytes;
            self.upload_calls += calls;
        }
        self.draws = 0;
        self.batches = 0;
        self.mask_passes = order.len() as u32;
        for planned in &passes {
            // The final color pass resolves directly into the surface. Only masks need
            // separate resolved textures because later passes sample them.
            let (resolved, multisampled) = match planned.mask {
                Some(index) => {
                    let target = self.masks[index].target.as_ref().unwrap();
                    (&target.view, target.multisampled.as_ref())
                }
                None => (color_view, self.multisampled_output.as_ref()),
            };
            let attachments = [Some(wgpu::RenderPassColorAttachment {
                view: multisampled.unwrap_or(resolved),
                depth_slice: None,
                resolve_target: multisampled.map(|_| resolved),
                ops: wgpu::Operations {
                    load: wgpu::LoadOp::Clear(wgpu::Color::TRANSPARENT),
                    // Only the resolved image is sampled by later passes.
                    store: if multisampled.is_some() {
                        wgpu::StoreOp::Discard
                    } else {
                        wgpu::StoreOp::Store
                    },
                },
            })];
            let mut pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                color_attachments: &attachments,
                ..Default::default()
            });
            let batches = self.draw_batches(
                &mut pass,
                &planned.jobs,
                planned.mask.is_some(),
                positions,
                culling,
            );
            drop(pass);
            self.batches += batches;
            self.draws += planned.jobs.len() as u32;
        }
        if let Some(size) = alpha_size {
            let sampler = self
                .alpha_sampler
                .get_or_insert_with(|| super::alpha::AlphaSampler::new(&self.device));
            self.alpha_readback =
                Some(sampler.encode(&self.device, &self.queue, &mut encoder, color_view, size));
        }
        if let Some((target, pipeline)) = alpha_target.zip(self.surface_blit.as_ref()) {
            let attachments = [Some(wgpu::RenderPassColorAttachment {
                view: &surface_view,
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
            pass.set_pipeline(pipeline);
            pass.set_bind_group(0, &target.group, &[]);
            pass.draw(0..3, 0..1);
        }
        self.queue.submit([encoder.finish()]);
        frame.present();
        Ok(())
    }
}
