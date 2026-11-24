# Full playback Wasm runtime

This directory contains the complete Rust playback runtime. Wallpaper selects it through `workerRuntime: 'rust'`. Library callers that omit that option use JavaScript orchestration and the smaller deformation kernel. The [Rust/wgpu renderer](./renderer/README.md) is available through the [desktop player](../src/native/create-native-player.ts) or through `renderer: 'wgpu'` in the [web player](../src/player/rendering-options.ts). [SOURCE.md](./SOURCE.md) records the runtime's origin. The browser adapter lives in [../src/player/internal/wasm](../src/player/internal/wasm).

Normal workspace builds use the checked-in `runtime.wasm`; Rust is needed only when changing native source. With Rust 1.96.0 and the `wasm32-unknown-unknown` target installed, run from the repository root:

```sh
CARGO_TARGET_DIR=/tmp/puppet-native-build RUSTFLAGS='-C target-feature=+simd128' \
  cargo build --locked --release \
  --manifest-path packages/puppet/native/Cargo.toml \
  --target wasm32-unknown-unknown -p poffo-worker
cp /tmp/puppet-native-build/wasm32-unknown-unknown/release/poffo_worker.wasm \
  packages/puppet/src/player/internal/wasm/runtime.wasm
```

The playback binary enables WebAssembly SIMD so LLVM can vectorize independent coordinate
operations. It retains f64 evaluation and the existing summation order; neither relaxed SIMD
nor floating-point reassociation is enabled. Rebuilding without this flag produces the scalar
comparison variant. Engines loading the SIMD binary must support `simd128`; initialization
failure follows the existing Worker fallback. After either build, compare the generated binary
with the previous binary using `pose-parity.integration.ts` and its `PARITY_BASELINE` option.

Larger cross-origin-isolated scenes use a separate two-thread build. Independent part and grid
evaluation runs in Rayon; physics, parent composition and Glue retain their ordered evaluation.
Per-part keyform samples borrow the authored channels, avoiding temporary sampled arrays and
shared-allocator work inside the parallel loop. Each part retains its own composition buffer.
The serial binary remains available to environments without shared memory. Build the threaded
variant with the pinned toolchain and matching `wasm-bindgen-cli` 0.2.129:

```sh
rustup toolchain install nightly-2026-05-25 --component rust-src --target wasm32-unknown-unknown
CARGO_TARGET_DIR=/tmp/puppet-parallel-build \
RUSTFLAGS='-C target-feature=+atomics,+bulk-memory,+simd128 -C link-arg=--shared-memory -C link-arg=--max-memory=1073741824 -C link-arg=--import-memory -C link-arg=--export=__wasm_init_tls -C link-arg=--export=__tls_size -C link-arg=--export=__tls_align -C link-arg=--export=__tls_base' \
  cargo +nightly-2026-05-25 build -Z build-std=panic_abort,std --locked --release \
  --manifest-path packages/puppet/native/Cargo.toml \
  --target wasm32-unknown-unknown -p poffo-worker --features parallel
wasm-bindgen --target web --out-name index \
  --out-dir packages/puppet/src/player/internal/wasm/parallel \
  /tmp/puppet-parallel-build/wasm32-unknown-unknown/release/poffo_worker.wasm
```

The `index` output name is required by wasm-bindgen-rayon's generated Worker helper. Check
`cpu-parallel.integration.tsx` for bit-exact serial/threaded evaluation of the real model.
Applications bundling the prebuilt library with Vite can add
[`puppetThreadWorkers()`](../vite/thread-workers.ts) from `@winter-love/puppet/vite/thread-workers`
to their plugins. It emits the Rust thread Workers beside the numerical Worker with their
original filenames. Applications with their own copy pipeline can use `PUPPET_THREAD_WORKERS`
from the same module. A build from Puppet source includes the helpers through its Worker graph.

Verify native changes with `cargo test`, `cargo clippy --all-targets -- -D warnings` and `cargo fmt --all --check`, each using the same manifest path. Run the Wasm adapter unit tests and `parity.integration.ts` after regenerating the binary. The latter accepts `MODEL`, `FRAMES` and `PARITY_OUTPUT` for a local model comparison. Its frame, checkpoint and vertex checks exercise the generated binary rather than the host Rust target.

Large keyform grids compile a coordinate index once rather than scanning every form for each
sample. Small grids retain their compact linear lookup. Authored order, duplicate precedence and
signed-zero equality are preserved. Parent-local corner caches retain their demand-driven
per-frame lifetime without the repeated OnceCell initialization path.

The byte ABI reuses its output allocation and moves already-owned checkpoint values into replies;
returned frame buffers and checkpoint snapshots keep their existing ownership contract.

The Worker ABI uses replacement render templates and separate f64 render buffers alongside its JSON checkpoint. The runtime also exposes the current numerical frame to GPU renderers sharing its memory. Neither path changes authored meshes or rigging.

Playback state and evaluation policy stay in Rust. The optional GPU geometry path defers supported leaf operations, retains owned frame snapshots for CPU corrections and Glue, and preserves the ordinary CPU evaluator. Its JavaScript adapter loads the modules, transfers buffers, serializes messages and calls browser APIs. Preserve the web runtime's event ordering and fixed-step physics when updating from the source SDK.
