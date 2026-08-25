# Focus room source assets

This directory stores editable, lossless source files only. Runtime code must import the generated WebP assets from the sibling runtime directories instead.

- `concept-art/`: original scene PNGs and their checksums
- `layers/<scene-id>/base.png` and `layer-*.png`: lossless inputs for runtime scene layers
- `layers/<scene-id>/mask-*.png`: layer extraction and restoration masks
- `layers/<scene-id>/workfiles/`: Krita files and retained production intermediates
- `animation/`: lossless eye and steam animation inputs
- `depth/`: exact 8-bit depth maps and their generation manifest
- `status-icons/`: lossless Pomodoro status icon inputs

After changing an image source, run `node scripts/compress-focus-room-scenes.mjs` from `apps/pomo`. The compressor keeps depth maps and masks lossless, quality-checks alpha sprites before choosing a smaller high-quality WebP over lossless WebP, and removes stale generated outputs. The Vite configuration rejects imports from this directory so source files cannot enter a production bundle accidentally.
