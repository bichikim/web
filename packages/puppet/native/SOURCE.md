# Native runtime source

`format/src` and `runtime/src` originate from the local Poffo Rust SDK, repository `team-monolith-product/tnm-puppet-sdk`, commit `280ab56` on `feature/web-poffo-sync`. The source repository was read without modification. Web Worker checkpoint and message adapters are maintained here alongside the browser integration.

The existing Rust implementation supplies playback, effects, physics, keyforms, deformation, skinning, Glue and render plans. Browser-specific I/O stays at the Wasm boundary. Changes in the native snapshot must retain parity with the current TypeScript reference, including independent expression channels and both parameter blend stages.
