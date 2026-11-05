# Playback Wasm

The production [Worker](../../buffering/worker.ts) runs playback, effects, audio analysis, physics, Glue, render planning and checkpoints through the JavaScript buffer engine. It loads the [deformation kernel](./deformation/README.md) for numeric geometry work. Unsupported geometry or unavailable Wasm retains the JavaScript evaluator inside the Worker.

The boundary passes numeric buffers and interpolation descriptors to Wasm; it does not serialize a complete frame and checkpoint through JSON on every step. Both implementations retain the existing host/Worker message contract, including transferred vertex buffers, generation/revision handling and notice acknowledgements.

The [full-runtime adapter](./create-worker.ts) and [native Rust runtime](../../../../native/README.md) remain available for comparison. The production Worker does not import that module. Its complete Rust runtime was slower for the supplied model; the [measurement record](../../../../visual/wasm-benchmark.json) records the tested partitions and artifacts.
