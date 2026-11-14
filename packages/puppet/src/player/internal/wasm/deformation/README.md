# Deformation kernel

This kernel evaluates grid keyform coordinates, parent-space grid interpolation, rigid point mappings and batched vertex mappings. JavaScript owns playback/state, interpolation descriptors, rotation-frame trigonometry, physics, Glue and display plans. Immutable model arrays are copied once; frame updates change numeric inputs and versions. Cached coordinates and part outputs are reused when their inputs remain equal.

Grid-cell descriptors follow each part's bitwise local XY inputs, independently of changing parent frames. Resizing invalidates those descriptors; world-space samples still follow the current node version. Descriptor storage is allocated with each mapper buffer and released with its document-owned Wasm instance.

Unchanged bindings reuse their interpolation descriptors independently of other bindings on the same grid, including their influence inputs.

Normal builds use `kernel.wasm`. Regenerate it from the repository root with Rust 1.96.0 and the `wasm32-unknown-unknown` target:

```sh
rustc --edition=2021 --crate-type=cdylib --target wasm32-unknown-unknown \
  -C opt-level=3 -C panic=abort -C target-feature=+simd128 -C strip=symbols \
  packages/puppet/src/player/internal/wasm/deformation/kernel.rs \
  -o packages/puppet/src/player/internal/wasm/deformation/kernel.wasm
```

Keep Float64 operation order and both weight-one rotation stages intact. Every instance owns its memory. Borrowed vertex views are reused until the input size changes or an allocation grows the memory; never retain a detached view. Run the adjacent unit and parity tests after native changes. The local model comparison verifies every vertex bit and the complete state/render plans against JavaScript.
