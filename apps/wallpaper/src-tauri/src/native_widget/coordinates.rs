const BLOCK_WORDS: usize = 128;

/// An initial full range followed by bitwise changes relative to the last IPC response.
#[derive(Default)]
pub(super) struct Coordinates {
    previous: Vec<u32>,
    packet: Vec<u32>,
}

impl Coordinates {
    pub(super) fn clear(&mut self) {
        self.previous.clear();
    }

    pub(super) fn encode(&mut self, vertices: &[f32]) -> &[u8] {
        let current: &[u32] = bytemuck::cast_slice(vertices);
        self.packet.clear();
        if current.len() != self.previous.len() {
            self.previous.resize(current.len(), 0);
            self.write(current, 0, current.len());
        } else {
            let mut start = None;
            for offset in (0..current.len()).step_by(BLOCK_WORDS) {
                let end = (offset + BLOCK_WORDS).min(current.len());
                if current[offset..end] == self.previous[offset..end] {
                    if let Some(first) = start.take() {
                        self.write(current, first, offset);
                    }
                } else {
                    start.get_or_insert(offset);
                }
            }
            if let Some(first) = start {
                self.write(current, first, current.len());
            }
        }
        bytemuck::cast_slice(&self.packet)
    }

    fn write(&mut self, current: &[u32], start: usize, end: usize) {
        let values = &current[start..end];
        self.packet.extend([start as u32, values.len() as u32]);
        self.packet.extend_from_slice(values);
        self.previous[start..end].copy_from_slice(values);
    }
}

#[cfg(test)]
mod tests {
    use super::{BLOCK_WORDS, Coordinates};

    #[test]
    fn returns_only_changed_blocks_and_preserves_bits() {
        let mut coordinates = Coordinates::default();
        let mut vertices = vec![0.0; BLOCK_WORDS * 3 + 2];
        let initial: &[u32] = bytemuck::cast_slice(coordinates.encode(&vertices));
        assert_eq!(&initial[..2], &[0, vertices.len() as u32]);
        assert_eq!(&initial[2..], vec![0; vertices.len()]);
        assert!(coordinates.encode(&vertices).is_empty());

        vertices[BLOCK_WORDS] = -0.0;
        vertices[BLOCK_WORDS * 2] = f32::from_bits(0x7fc0_0001);
        vertices[BLOCK_WORDS * 3] = 1.0;
        let changed: &[u32] = bytemuck::cast_slice(coordinates.encode(&vertices));
        assert_eq!(
            &changed[..2],
            &[BLOCK_WORDS as u32, (BLOCK_WORDS * 2 + 2) as u32]
        );
        assert_eq!(
            &changed[2..],
            bytemuck::cast_slice::<_, u32>(&vertices[BLOCK_WORDS..])
        );
        assert!(coordinates.encode(&vertices).is_empty());

        coordinates.clear();
        assert_eq!(
            coordinates.encode(&vertices).len(),
            (vertices.len() + 2) * 4
        );
    }
}
