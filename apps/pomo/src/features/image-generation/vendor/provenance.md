# Bonsai browser runtime

Source: https://huggingface.co/spaces/webml-community/bonsai-image-webgpu

Revision: e0c8de64e86a2085c22de476b52ec3939ff7e85c

Asset: `assets/index-Bf-HmMxp.js`

Upstream SHA-256: `8e1726c485bfdae81ad7fa479a73a60cc27313a40e5b76b588245d1c9416f0eb`

`runtime.mjs` retains the inference portion, from `var e=Object.freeze` through the function immediately before `var Gi={LEFT:0`. The Vite preload helper, Three.js scene and demo UI are excluded. The only API change is exporting `Bi` as `Flux2KleinPipeline`. Model weights are downloaded by the runtime and are not included here.

The upstream Space publishes a minified bundle, not a standalone versioned SDK. Replace this adapter when its maintainers publish that API. Model licensing must not be taken as a license declaration for this browser bundle.

The `.mjs` extension keeps Solid refresh from treating uppercase-named inference functions as components. With `.js`, its `An(inputDtype, outputDtype)` helper lost the second argument and produced WGSL without `enable f16`. No inference code is modified.
