# GPU renderer

This crate contains the mesh renderer and an optional [precise leaf-geometry kernel](./src/geometry.rs). The renderer receives computed meshes and draw properties; the geometry kernel evaluates only supported deferred leaf operations. Neither changes authored model or rigging data. Its browser adapter is [rendering/wgpu](../../src/player/rendering/wgpu). Supported scene composition is defined by [supports-document.ts](../../src/player/rendering/wgpu/supports-document.ts); other scenes retain Pixi.

The GPU Worker renders its OffscreenCanvas and transfers an ImageBitmap to the caller's bitmap Canvas. The completed color frame is never mapped to CPU pixels. On request, a compute pass samples alpha from the resolved surface into a smaller buffer for native click-through. Mapping this buffer does not gate frame presentation. Picking uses the displayed geometry and original texture alpha. Input flush waits for image submission before acknowledging its corresponding state.

The final color pass writes to the Canvas surface directly. With MSAA it resolves into the current surface texture from a reusable multisampled attachment. Mask passes keep their own sampled textures, and texture uploads still use the blit shader to generate mipmaps.

[upload.rs](./src/upload.rs) retains GPU buffer contents and writes only changed, four-byte-aligned
ranges. Changes use one enclosing span per buffer, including unchanged interior bytes when edits
are scattered. This bounds GPU-process submissions and skips scanning the changed interior. A shorter active
uniform range preserves its retained tail for later frames. Ordinary CPU frames use complete recycled arrays; shared geometry frames use an owned frame ticket and omit the vertex upload from the draw message.

[batch.rs](./src/renderer/batch.rs) groups adjacent parts with the same pipeline, texture and
clipping state. Each run binds that state once; every part retains its uniform offset, individual
draw and blending boundary. Parts are never sorted by texture. Drawing state is rebuilt from the
current frame, so visibility, paint order and resized mask resources cannot retain old bindings.
Parts retain direct render-pass draws rather than merged meshes or render bundles. Shaders,
topology and draw order are unchanged. `CanvasRenderer.info()` reports per-frame upload bytes/calls and
state-batch counts without adding per-frame Worker messages.

Rebuild with the workspace Rust version, the `wasm32-unknown-unknown` target and `wasm-bindgen-cli` 0.2.129:

```sh
CARGO_TARGET_DIR=/tmp/puppet-native-build RUSTFLAGS='-C target-feature=+simd128' \
  cargo build --locked --release \
  --manifest-path packages/puppet/native/Cargo.toml \
  --target wasm32-unknown-unknown -p poffo-gpu
wasm-bindgen --target web --out-name runtime \
  --out-dir packages/puppet/src/player/rendering/wgpu/wasm \
  /tmp/puppet-native-build/wasm32-unknown-unknown/release/poffo_gpu.wasm
pnpm format
pnpm --filter @winter-love/puppet build
```

The generated adapter and WASM binary are checked in together. Normal workspace builds do not require Rust or wasm-bindgen.

The SIMD build compares retained buffer bytes in 128-bit blocks. This is an integer equality
operation; shader code and floating-point evaluation are unchanged. Non-SIMD builds use scalar
byte comparison for the same upload decisions.

Run the native workspace tests and Wasm-target Clippy. For browser composition comparisons, set `PUPPET_TEST_WEBGPU=1` when running `create-player.wgpu.integration.tsx` with `vitest.browser.config.ts`. This enables Chromium's WebGPU test adapter; environments without an adapter skip those GPU-only cases. Native Wallpaper verification still requires the actual WebKit window.

The geometry kernel uses integer-controlled double-single arithmetic adapted from
[luma.gl](https://luma.gl/docs/api-reference/shaders/shader-modules/fp64-arithmetic).
The upstream MIT license and exact source revision are retained in
[src/geometry](./src/geometry). This is extended precision, not IEEE binary64.
Its rounding feedback uses the original f64 operation sequence before Glue. Unsupported transformations stay on the numerical CPU Worker.

[computation.rs](./src/computation.rs) initializes the geometry kernel from the raster renderer's existing device and queue. A direct MessagePort delivers preparation packets from the numerical Worker. Correction and original ordered Glue run in Rust in the GPU Worker; the numerical Worker immediately delivers a render ticket and can compute the next frame. Pre-Glue coordinates return asynchronously for its deformation cache. Native snapshots retain the exact final CPU coordinates and GPU vertex buffers until release, so newer preparations cannot overwrite an older prediction.

Coordinate readback remains local to the GPU Worker for exact corrections, Glue and render bounds. Final coordinates return with the bitmap for picking. The shared geometry path limits numerical requests to one in flight because replies no longer wait for GPU completion; native deferred cache slots remain bounded at three, and GPU snapshots have a defensive limit of sixteen. Disposal or renderer replacement releases the connection and restarts numerical preparation against the current device.

Kernel completion measurements that include `map_async` or Worker messages must not be presented as pure GPU execution time.
