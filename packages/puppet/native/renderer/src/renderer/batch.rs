//! Groups adjacent drawing state without changing paint order or individual blend boundaries.
use super::Renderer;
use std::ops::Range;

pub(super) struct DrawCommand {
    pub(super) indices: Range<u32>,
    pub(super) slot: u32,
    pub(super) texture: usize,
    pub(super) mask: Option<usize>,
    pub(super) multiply: bool,
}

impl Renderer {
    pub(super) fn draw_batches<'a>(
        &'a self,
        pass: &mut wgpu::RenderPass<'a>,
        commands: &[DrawCommand],
        mask: bool,
        positions: &'a wgpu::Buffer,
        culled: bool,
    ) -> u32 {
        pass.set_vertex_buffer(0, positions.slice(..));
        pass.set_vertex_buffer(1, self.uvs.slice(..));
        pass.set_index_buffer(
            if mask || !culled {
                &self.mask_indices
            } else {
                &self.indices
            }
            .slice(..),
            wgpu::IndexFormat::Uint32,
        );
        let batches = commands.chunk_by(|left, right| {
            left.texture == right.texture
                && left.mask == right.mask
                && left.multiply == right.multiply
        });
        let mut count = 0;
        for commands in batches {
            let state = &commands[0];
            pass.set_pipeline(if mask {
                self.mask_pipeline.as_ref().unwrap_or(&self.normal)
            } else if state.multiply {
                &self.multiply
            } else {
                &self.normal
            });
            pass.set_bind_group(1, &self.textures[state.texture].group, &[]);
            let clip = state
                .mask
                .map(|index| self.masks[index].target.as_ref().unwrap())
                .unwrap_or(&self.empty);
            pass.set_bind_group(2, &clip.group, &[]);
            for command in commands {
                pass.set_bind_group(0, &self.uniform_group, &[command.slot]);
                pass.draw_indexed(command.indices.clone(), 0, 0..1);
            }
            count += 1;
        }
        count
    }
}
