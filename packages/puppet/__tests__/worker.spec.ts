import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import {expect, test, vi} from 'vitest'

const source = readFileSync('packages/puppet/public/tracking/worker.js', 'utf8')
const createWorker = () => {
  const scope = {
    Error,
    importScripts: vi.fn(),
    onmessage: async (_event: {data: unknown}) => undefined,
    postMessage: vi.fn(),
    Vision: {FaceLandmarker: {createFromOptions: vi.fn().mockResolvedValue({})}},
  }
  runInNewContext(source, scope)
  return scope
}

test.each([true, false])('should load only package-owned assets with SIMD=%s', async (simd) => {
  const worker = createWorker()
  await worker.onmessage({
    data: {
      runtime: 'https://untrusted.example/runtime.js',
      simd,
      type: 'initialize',
      wasm: {
        wasmBinaryPath: 'https://untrusted.example/model.wasm',
        wasmLoaderPath: 'https://untrusted.example/loader.js',
      },
    },
  })
  expect(worker.importScripts).toHaveBeenCalledExactlyOnceWith('/tracking/vendor/vision_bundle.js')
  expect(worker.Vision.FaceLandmarker.createFromOptions).toHaveBeenCalledExactlyOnceWith(
    {
      wasmBinaryPath: simd
        ? '/tracking/vendor/vision_wasm_internal.wasm'
        : '/tracking/vendor/vision_wasm_nosimd_internal.wasm',
      wasmLoaderPath: simd
        ? '/tracking/vendor/vision_wasm_internal.js'
        : '/tracking/vendor/vision_wasm_nosimd_internal.js',
    },
    expect.objectContaining({
      baseOptions: {delegate: 'CPU', modelAssetPath: '/tracking/face.task'},
    }),
  )
  expect(worker.postMessage).toHaveBeenCalledExactlyOnceWith({type: 'ready'})
})

test.each([undefined, 'true', {}])(
  'should reject an invalid SIMD flag %j before loading assets',
  async (simd) => {
    const worker = createWorker()
    await worker.onmessage({data: {simd, type: 'initialize'}})
    expect(worker.importScripts).not.toHaveBeenCalled()
    expect(worker.Vision.FaceLandmarker.createFromOptions).not.toHaveBeenCalled()
    expect(worker.postMessage).toHaveBeenCalledExactlyOnceWith({
      message: expect.any(String),
      type: 'error',
    })
  },
)
