# Full playback Wasm reference

This directory retains the complete Rust playback runtime for comparison. The production browser Worker currently uses JavaScript orchestration and the smaller deformation kernel. [SOURCE.md](./SOURCE.md) records its origin. The browser adapter lives in [../src/player/internal/wasm](../src/player/internal/wasm).

Normal workspace builds use the checked-in `runtime.wasm`; Rust is needed only when changing native source. With Rust 1.96.0 and the `wasm32-unknown-unknown` target installed, run from the repository root:

```sh
CARGO_TARGET_DIR=/tmp/puppet-native-build cargo build --locked --release \
  --manifest-path packages/puppet/native/Cargo.toml \
  --target wasm32-unknown-unknown -p poffo-worker
cp /tmp/puppet-native-build/wasm32-unknown-unknown/release/poffo_worker.wasm \
  packages/puppet/src/player/internal/wasm/runtime.wasm
```

Verify native changes with `cargo test`, `cargo clippy --all-targets -- -D warnings` and `cargo fmt --all --check`, each using the same manifest path. Run the Wasm adapter unit tests and `parity.integration.ts` after regenerating the binary. The latter accepts `MODEL`, `FRAMES` and `PARITY_OUTPUT` for a local model comparison. Its frame, checkpoint and vertex checks exercise the generated binary rather than the host Rust target.

In this complete runtime, playback state and evaluation stay in Rust. Its JavaScript adapter only loads the module, copies numeric buffers, serializes messages and calls browser APIs. Preserve the web runtime's event ordering and fixed-step physics when updating from the source SDK.
