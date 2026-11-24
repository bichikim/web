/** @vitest-environment node */
import {expect, it, vi} from 'vitest'

const runtimes = vi.hoisted(() => ({
  wasm: {env: {wasm: {numThreads: 0, wasmPaths: ''}}},
  webgpu: {env: {wasm: {numThreads: 0, wasmPaths: ''}}},
}))

vi.mock('onnxruntime-web/wasm', () => runtimes.wasm)
vi.mock('onnxruntime-web/webgpu', () => runtimes.webgpu)

import {SUPERTONIC_ORT_WASM_URL} from '@winter-love/supertonic/model'
import {loadSupertonicRuntime} from '@winter-love/supertonic/runtime'

it.each([
  ['wasm', runtimes.wasm],
  ['webgpu', runtimes.webgpu],
] as const)('should configure the %s runtime', async (backend, expectedRuntime) => {
  const runtime = await loadSupertonicRuntime(backend)

  expect(runtime.env.wasm).toEqual({numThreads: 1, wasmPaths: SUPERTONIC_ORT_WASM_URL})
  expect(expectedRuntime.env.wasm).toBe(runtime.env.wasm)
})

it('should use caller-supplied bundled execution files without changing the default for other callers', async () => {
  const runtime = await loadSupertonicRuntime('wasm', '/voice-runtime/')
  expect(runtime.env.wasm.wasmPaths).toBe('/voice-runtime/')
  const restored = await loadSupertonicRuntime('wasm')
  expect(restored.env.wasm.wasmPaths).toBe(SUPERTONIC_ORT_WASM_URL)
})
