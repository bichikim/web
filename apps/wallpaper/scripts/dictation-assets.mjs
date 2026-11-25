import {createRequire} from 'node:module'
import {dirname, join} from 'node:path'
import {normalizePath} from 'vite'

const require = createRequire(import.meta.url)
const detector = require.resolve('@ricky0123/vad-web')
const runtime = createRequire(detector).resolve('onnxruntime-web/wasm')

export const dictationAssets = [
  join(dirname(detector), 'silero_vad_v5.onnx'),
  join(dirname(detector), 'vad.worklet.bundle.min.js'),
  join(dirname(runtime), 'ort-wasm-simd-threaded.mjs'),
  join(dirname(runtime), 'ort-wasm-simd-threaded.wasm'),
].map((src) => ({dest: 'dictation-runtime', src: normalizePath(src)}))
