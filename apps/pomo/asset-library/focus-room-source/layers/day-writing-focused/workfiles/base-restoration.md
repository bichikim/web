# Day writing base — head and hands removed

- `base.png`: the original 1672×941 scene with only the head, hands, wrists, and held pen removed.
- `preview-base.png`: the selected generated image used as the PixiJS review-page base.
- `mask-head-hands-removal.png`: the exact blended region replaced from the generated restoration.

The laptop and open writing notebook remain in the scene. Only notebook pixels hidden by the removed hands and pen are reconstructed. Pixels outside the removal mask are copied directly from the original image.
