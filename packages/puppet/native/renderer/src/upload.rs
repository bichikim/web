//! Retains GPU-visible bytes and plans aligned, bounded partial buffer updates.
use std::ops::Range;

fn equal(a: &[u8], b: &[u8]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    #[cfg(all(target_arch = "wasm32", target_feature = "simd128"))]
    {
        use core::arch::wasm32::{v128_any_true, v128_load, v128_xor};
        let mut left = a.chunks_exact(16);
        let mut right = b.chunks_exact(16);
        for (left, right) in left.by_ref().zip(right.by_ref()) {
            // Each borrowed chunk contains all 16 loaded bytes; v128_load permits unaligned addresses.
            let difference = unsafe {
                v128_xor(
                    v128_load(left.as_ptr().cast()),
                    v128_load(right.as_ptr().cast()),
                )
            };
            if v128_any_true(difference) {
                return false;
            }
        }
        left.remainder() == right.remainder()
    }
    #[cfg(not(all(target_arch = "wasm32", target_feature = "simd128")))]
    {
        a == b
    }
}

fn matches(stored: Option<&[u8]>, current: &[u8]) -> bool {
    stored.is_some_and(|stored| equal(stored, current))
}

#[derive(Default)]
pub(crate) struct UploadCache {
    bytes: Vec<u8>,
    ranges: Vec<Range<usize>>,
}
impl UploadCache {
    pub(crate) fn invalidate(&mut self) {
        self.bytes.clear();
        self.ranges.clear();
    }
    pub(crate) fn replace(&mut self, bytes: &[u8]) {
        self.bytes.clear();
        self.bytes.extend_from_slice(bytes);
        self.ranges.clear();
    }

    /// The caller initialized its GPU buffer with these exact bytes.
    pub(crate) fn initialized(bytes: &[u8]) -> Self {
        Self {
            bytes: bytes.to_vec(),
            ranges: Vec::with_capacity(1),
        }
    }
    /// A shorter frame does not erase the buffer's retained tail. Growing later compares with
    /// what is actually still in GPU memory, including ranges skipped by intermediate frames.
    pub(crate) fn update(&mut self, bytes: &[u8]) -> &[Range<usize>] {
        assert_eq!(bytes.len() % 4, 0);
        self.ranges.clear();
        let differs = |(block, current): &(usize, &[u8])| {
            !matches(
                self.bytes.get(block * 256..block * 256 + current.len()),
                current,
            )
        };
        let mut blocks = bytes.chunks(256).enumerate();
        let Some((first, _)) = blocks.find(differs) else {
            return &self.ranges;
        };
        let last = blocks.rfind(differs).map_or(first, |(block, _)| block);
        let changed_word = |start: &usize| {
            !matches(
                self.bytes.get(*start..*start + 4),
                &bytes[*start..*start + 4],
            )
        };
        let start = (first * 256..((first + 1) * 256).min(bytes.len()))
            .step_by(4)
            .find(changed_word)
            .unwrap();
        let end = (last * 256..((last + 1) * 256).min(bytes.len()))
            .step_by(4)
            .rfind(changed_word)
            .unwrap()
            + 4;
        // A single enclosing span bounds GPU-process submissions even for scattered edits.
        // Bulk deformation skips comparison of the changed interior entirely.
        self.ranges.push(start..end);
        self.bytes.resize(self.bytes.len().max(bytes.len()), 0);
        for range in &self.ranges {
            self.bytes[range.clone()].copy_from_slice(&bytes[range.clone()]);
        }
        &self.ranges
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn unchanged_frames_and_single_coordinate_updates_preserve_exact_gpu_bytes() {
        let initial = vec![0_u8; 4096];
        let mut cache = UploadCache::initialized(&initial);
        assert!(cache.update(&initial).is_empty());
        let mut next = initial.clone();
        next[12..16].copy_from_slice(&(-0.0_f32).to_bits().to_le_bytes());
        assert_eq!(cache.update(&next), std::slice::from_ref(&(12..16)));
        assert!(cache.update(&next).is_empty());
        assert_eq!(cache.update(&initial), std::slice::from_ref(&(12..16)));
    }

    #[test]
    fn fragmented_large_frames_have_bounded_writes_and_reconstruct_every_byte() {
        for length in [1024, 512 * 1024] {
            let mut cache = UploadCache::default();
            let mut gpu = vec![0_u8; length];
            let mut next = vec![0_u8; length];
            let first = cache.update(&next).to_vec();
            assert_eq!(first.as_slice(), std::slice::from_ref(&(0..length)));
            for offset in (0..length).step_by(256) {
                next[offset..offset + 4].copy_from_slice(&(offset as u32 + 1).to_le_bytes());
            }
            let ranges = cache.update(&next);
            assert!(ranges.len() <= 1);
            for range in ranges {
                assert_eq!(range.start % 4, 0);
                assert_eq!(range.end % 4, 0);
                gpu[range.clone()].copy_from_slice(&next[range.clone()]);
            }
            assert_eq!(gpu, next);
            assert!(cache.update(&next).is_empty());
        }
    }

    #[test]
    fn shrinking_then_growing_retains_the_gpu_tail_without_omitting_new_zero_bytes() {
        let mut cache = UploadCache::default();
        assert_eq!(cache.update(&[0; 16]), std::slice::from_ref(&(0..16)));
        assert!(cache.update(&[0; 4]).is_empty());
        assert!(cache.update(&[0; 16]).is_empty());
        assert_eq!(cache.update(&[0; 20]), std::slice::from_ref(&(16..20)));
        let mut next = [0; 20];
        next[16] = 1;
        assert_eq!(cache.update(&next), std::slice::from_ref(&(16..20)));
        assert!(cache.update(&next[..4]).is_empty());
        assert_eq!(cache.update(&[0; 20]), std::slice::from_ref(&(16..20)));
    }

    #[test]
    fn widespread_changes_coalesce_into_one_write_instead_of_many_small_submissions() {
        let mut bytes = vec![0; 65536];
        let mut cache = UploadCache::initialized(&bytes);
        for block in bytes.chunks_mut(256) {
            block[0] = 1;
        }
        assert_eq!(cache.update(&bytes), std::slice::from_ref(&(0..65284)));
        assert!(cache.update(&bytes).is_empty());
    }

    #[test]
    fn gpu_written_bytes_replace_the_cache_and_invalidation_forces_reupload() {
        let mut cache = UploadCache::initialized(&[1; 16]);
        cache.replace(&[2; 16]);
        assert!(cache.update(&[2; 16]).is_empty());
        assert_eq!(cache.update(&[1; 16]), std::slice::from_ref(&(0..16)));
        cache.invalidate();
        assert_eq!(cache.update(&[1; 16]), std::slice::from_ref(&(0..16)));
    }

    #[test]
    fn distant_sparse_changes_use_one_enclosing_write() {
        let mut bytes = vec![0; 16384];
        let mut cache = UploadCache::initialized(&bytes);
        for offset in [16, 8192, 16352] {
            bytes[offset] = 1;
        }
        assert_eq!(cache.update(&bytes), std::slice::from_ref(&(16..16356)));
        assert!(cache.update(&bytes).is_empty());
    }
}
