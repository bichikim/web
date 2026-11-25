use super::{coordinates::Coordinates, packet};
use poffo_gpu::native::{AlphaReadback, NativeRenderer};
use poffo_runtime::WorkerRuntime;
use serde::Deserialize;
use std::sync::{Arc, Weak};
use tokio::sync::oneshot;

#[derive(Deserialize)]
pub(super) struct Open {
    pub size: [u32; 2],
    pub metadata: String,
    pub textures: Vec<usize>,
}

#[derive(Deserialize)]
pub(super) struct Playback {
    pub id: String,
    pub length: usize,
    pub section: Option<u32>,
    pub target: Option<Target>,
}

#[derive(Deserialize)]
pub(super) struct Target {
    size: [u32; 2],
    view: [f32; 4],
    alpha: Option<[u32; 2]>,
}

#[derive(Deserialize)]
pub(super) struct Draw {
    pub id: String,
    pub size: [u32; 2],
    pub view: [f32; 4],
    pub frame: Option<u32>,
    pub display: usize,
    pub alpha: Option<[u32; 2]>,
}

pub(super) struct Session {
    pub renderer: NativeRenderer,
    runtime: WorkerRuntime,
    reply: Vec<u8>,
    coordinates: Coordinates,
    alpha_running: Weak<()>,
    alpha_result: Option<AlphaResult>,
}

pub(super) type AlphaResult = oneshot::Receiver<Result<Vec<u8>, String>>;
pub(super) fn check_size(size: [u32; 2]) -> Result<(), String> {
    if size.iter().all(|v| (1..=8192).contains(v)) {
        Ok(())
    } else {
        Err("Invalid native backing dimensions".into())
    }
}

impl Session {
    pub(super) fn new(
        mut renderer: NativeRenderer,
        sizes: Vec<usize>,
        bytes: &[u8],
    ) -> Result<Self, String> {
        let mut offset = 0_usize;
        for size in sizes {
            let end = offset
                .checked_add(size)
                .ok_or("Texture bytes exceed packet capacity")?;
            let encoded = bytes.get(offset..end).ok_or("Truncated native texture")?;
            let mut reader = image::ImageReader::new(std::io::Cursor::new(encoded))
                .with_guessed_format()
                .map_err(|error| error.to_string())?;
            let mut limits = image::Limits::default();
            limits.max_image_width = Some(8192);
            limits.max_image_height = Some(8192);
            reader.limits(limits);
            let mut decoded = reader
                .decode()
                .map_err(|error| error.to_string())?
                .into_rgba8();
            for pixel in decoded.chunks_exact_mut(4) {
                let alpha = u16::from(pixel[3]);
                for channel in &mut pixel[..3] {
                    *channel = ((u16::from(*channel) * alpha + 127) / 255) as u8;
                }
            }
            renderer.upload_premultiplied_rgba([decoded.width(), decoded.height()], &decoded)?;
            offset = end;
        }
        if offset != bytes.len() {
            return Err("Trailing texture data".into());
        }
        Ok(Self {
            renderer,
            runtime: WorkerRuntime::default(),
            reply: Vec::new(),
            coordinates: Coordinates::default(),
            alpha_running: Weak::new(),
            alpha_result: None,
        })
    }

    pub(super) async fn playback(
        &mut self,
        command: Playback,
        bytes: Vec<u8>,
    ) -> Result<Vec<u8>, String> {
        if let Some(section) = command.section {
            self.renderer.reset_playback();
            self.runtime = WorkerRuntime::default();
            self.coordinates.clear();
            self.runtime
                .write_runtime_section(&bytes, section, true, &mut self.reply);
            return Ok(packet::response(&self.reply, None, &[], &[], &[]));
        }
        #[derive(Deserialize)]
        struct Kind<'a> {
            kind: &'a str,
        }
        let input = bytes
            .get(..command.length)
            .ok_or("Incomplete native playback request")?;
        let Kind { kind } = serde_json::from_slice(input).map_err(|error| error.to_string())?;
        if kind == "initialize" {
            self.renderer.reset_playback();
            self.runtime = WorkerRuntime::default();
            self.coordinates.clear();
        }
        if !self.runtime.write_packed_json(input, &[], &mut self.reply) {
            return Ok(packet::response(&self.reply, None, &[], &[], &[]));
        }
        let frame = self.renderer.prepare(&mut self.runtime).await?;
        if let Some(target) = command.target {
            let result = self.draw_playback(frame, target);
            if let Some(id) = frame {
                self.renderer.release(id);
            }
            return result;
        }
        Ok(packet::response(
            &self.reply,
            frame,
            bytemuck::cast_slice(self.coordinates_for(frame)),
            self.runtime.part_values(),
            self.runtime.layer_values(),
        ))
    }

    fn draw_playback(&mut self, frame: Option<u32>, target: Target) -> Result<Vec<u8>, String> {
        check_size(target.size)?;
        let scene = self
            .runtime
            .frame()
            .ok_or("Missing native playback frame")?;
        let alpha = target
            .alpha
            .filter(|_| self.alpha_running.upgrade().is_none());
        let readback = self.renderer.draw_playback(
            target.size,
            target.view,
            frame,
            self.runtime.vertices(),
            &scene.plans,
            alpha,
        )?;
        if let Some(readback) = readback {
            self.start_alpha(readback);
        }
        let coordinates = frame
            .and_then(|id| self.renderer.coordinates(id))
            .unwrap_or_else(|| self.runtime.vertices());
        Ok(packet::response(
            &self.reply,
            None,
            self.coordinates.encode(coordinates),
            self.runtime.part_values(),
            self.runtime.layer_values(),
        ))
    }

    fn coordinates_for(&self, frame: Option<u32>) -> &[f32] {
        frame
            .and_then(|id| self.renderer.coordinates(id))
            .unwrap_or_else(|| self.runtime.vertices())
    }

    fn start_alpha(&mut self, readback: AlphaReadback) {
        let (response, result) = oneshot::channel();
        let running = Arc::new(());
        self.alpha_running = Arc::downgrade(&running);
        self.alpha_result = Some(result);
        tauri::async_runtime::spawn_blocking(move || {
            let result = tauri::async_runtime::block_on(readback.read());
            drop(running);
            let _ = response.send(result);
        });
    }

    pub(super) fn take_alpha(&mut self) -> Result<AlphaResult, String> {
        self.alpha_result
            .take()
            .ok_or_else(|| "No native alpha request".into())
    }

    pub(super) async fn present(
        &mut self,
        command: Draw,
        bytes: Vec<u8>,
    ) -> Result<Vec<u8>, String> {
        check_size(command.size)?;
        let end = command
            .display
            .checked_mul(4)
            .ok_or("Native display packet is too large")?;
        let display = packet::floats(bytes.get(..end).ok_or("Truncated native display packet")?)?;
        let coordinates = packet::floats(&bytes[end..])?;
        self.renderer
            .present(
                command.size,
                command.view,
                command.frame,
                &coordinates,
                &display,
                command
                    .alpha
                    .filter(|_| self.alpha_running.upgrade().is_none()),
            )
            .await
    }
}
