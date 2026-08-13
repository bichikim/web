# Focus room source assets

This directory stores editable, lossless source files only. Runtime code must import the compressed assets from `concept-art/` and `focus-room-layers/` instead.

- `concept-art/`: original scene PNGs and their checksums
- `layers/<scene-id>/base.png`: lossless input for the runtime `base.webp`
- `layers/<scene-id>/mask-*.png`: layer extraction and restoration masks
- `layers/<scene-id>/workfiles/`: Krita files and retained production intermediates

Run `pnpm --filter @apps/pomo assets:compress-focus-room` after changing a source scene or base. The Vite configuration rejects imports from this directory so source files cannot enter a production bundle accidentally.
