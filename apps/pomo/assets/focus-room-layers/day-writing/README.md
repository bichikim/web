# Day writing layer trial

All PNGs use the original 1672×941 canvas and coordinates.

- `base.png`: room and headless character body with the animated parts removed.
- `layer-*.png`: transparent layers cut from the original image pixels.
- `layer-writing-hand.png` and `layer-resting-hand.png`: full-canvas alpha splits of the original hand layer for independent animation.
- `chroma-*.png`: the same layers on a flat `#00ff00` background.
- `mask-*.png`: binary masks used for extraction and base inpainting.

Composite order: `base` → `items` → `head` → `hands`.

The item layer contains only pixels visible in the source. Parts hidden behind hands,
sleeves, or headphones are not invented, so larger item motion requires a separate
occluded-area reconstruction pass.
