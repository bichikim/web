import {expect, it} from 'vitest'
import {getTextRuntimeAssetUrl} from '../runtime-assets'

it.each([
  'ort-wasm-simd-threaded.mjs',
  'ort-wasm-simd-threaded.wasm',
  'ort-wasm-simd-threaded.asyncify.mjs',
  'ort-wasm-simd-threaded.asyncify.wasm',
])('should retain the browser-selected runtime file %s on R2', (file) => {
  expect(
    getTextRuntimeAssetUrl(`https://cdn.jsdelivr.net/npm/onnxruntime-web@1.27.0/dist/${file}`),
  ).toBe(`https://storage.pomofi.io/runtime/onnxruntime-web/1.27.0/${file}`)
})

it('should retain an initialized cached module URL', () => {
  expect(getTextRuntimeAssetUrl('blob:cached-runtime')).toBe('blob:cached-runtime')
  expect(getTextRuntimeAssetUrl(undefined)).toBeUndefined()
})
