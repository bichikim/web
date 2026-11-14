const OPTIMIZE_DEPS_INCLUDE = [
  '@apps-in-toss/web-framework',
  '@huggingface/transformers',
  '@inlang/paraglide-js/urlpattern-polyfill',
  '@solidjs/start/fns/client',
  '@tauri-apps/api/event',
  '@tauri-apps/api/window',
  'class-variance-authority',
  'dexie',
  'es-toolkit/fp',
  'ofetch',
  'onnxruntime-web/wasm',
  'onnxruntime-web/webgpu',
  'pixi.js',
  'wlipsync',
  'zod',
] as const

export const getOptimizeDepsInclude = () => [...OPTIMIZE_DEPS_INCLUDE]
