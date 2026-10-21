import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {getSupertonicModel} from '@winter-love/supertonic/model'
import type {SupertonicSessions} from '@winter-love/supertonic/engine'
import {failureResult, successResult} from '@winter-love/supertonic/result'
import {loadSupertonicRuntime, type SupertonicRuntime} from '@winter-love/supertonic/runtime'
import {loadSessions} from '@winter-love/supertonic/sessions'
import {createModelSessions} from '../create-model-sessions'

vi.mock('@winter-love/supertonic/runtime', () => ({loadSupertonicRuntime: vi.fn()}))
vi.mock('@winter-love/supertonic/sessions', () => ({loadSessions: vi.fn()}))
const sessions = () =>
  ({
    durationPredictor: {release: vi.fn()},
    textEncoder: {release: vi.fn()},
    vectorEstimator: {release: vi.fn()},
    vocoder: {release: vi.fn()},
  }) as unknown as SupertonicSessions
const options = (model: 'full' | 'int8' = 'full') => ({
  loadBuffer: vi.fn(),
  model: getSupertonicModel(model),
  signal: new AbortController().signal,
})
const backendError = () =>
  failureResult({
    backend: 'webgpu' as const,
    code: 'backend-failed' as const,
    detail: 'GPU unavailable',
    phase: 'initialize' as const,
    retryable: true,
  })
beforeEach(() => {
  vi.mocked(loadSupertonicRuntime).mockResolvedValue({} as SupertonicRuntime)
})
afterEach(() => {
  vi.resetAllMocks()
  vi.unstubAllGlobals()
})
it('should reuse GPU capability and the imported runtime across model initialization', async () => {
  const gpu = vi.fn(() => ({}))
  vi.stubGlobal('navigator', {
    get gpu() {
      return gpu()
    },
  })
  vi.mocked(loadSessions).mockResolvedValue(successResult(sessions()))
  const loader = createModelSessions()
  await expect(loader.load(options())).resolves.toMatchObject({
    ok: true,
    value: {backend: 'webgpu'},
  })
  await expect(loader.load(options())).resolves.toMatchObject({
    ok: true,
    value: {backend: 'webgpu'},
  })
  expect(gpu).toHaveBeenCalledOnce()
  expect(loadSupertonicRuntime).toHaveBeenCalledExactlyOnceWith('webgpu')
})
it('should use CPU without probing an adapter when GPU is absent or the model requires WASM', async () => {
  const gpu = vi.fn(() => undefined)
  vi.stubGlobal('navigator', {
    get gpu() {
      return gpu()
    },
  })
  vi.mocked(loadSessions).mockResolvedValue(successResult(sessions()))
  const loader = createModelSessions()
  await loader.load(options('int8'))
  expect(gpu).not.toHaveBeenCalled()
  await loader.load(options())
  await loader.load(options())
  expect(gpu).toHaveBeenCalledOnce()
  expect(loadSupertonicRuntime).toHaveBeenCalledExactlyOnceWith('wasm')
})
it('should remember model GPU initialization failure and avoid retrying it after model switches', async () => {
  vi.stubGlobal('navigator', {gpu: {}})
  vi.mocked(loadSessions).mockResolvedValue(successResult(sessions()))
  vi.mocked(loadSessions).mockResolvedValueOnce(backendError())
  const loader = createModelSessions()
  await expect(loader.load(options())).resolves.toMatchObject({ok: true, value: {backend: 'wasm'}})
  await loader.load(options('int8'))
  await loader.load(options())
  expect(vi.mocked(loadSessions).mock.calls.map(([value]) => value.backend)).toEqual([
    'webgpu',
    'wasm',
    'wasm',
    'wasm',
  ])
})
it('should fall back once when the GPU runtime itself cannot load', async () => {
  vi.stubGlobal('navigator', {gpu: {}})
  vi.mocked(loadSupertonicRuntime).mockRejectedValueOnce(new Error('GPU runtime unavailable'))
  vi.mocked(loadSessions).mockResolvedValue(successResult(sessions()))
  const loader = createModelSessions()
  await expect(loader.load(options())).resolves.toMatchObject({ok: true, value: {backend: 'wasm'}})
  await loader.load(options())
  expect(vi.mocked(loadSupertonicRuntime).mock.calls).toEqual([['webgpu'], ['wasm']])
})
it('should preserve download errors without disabling or retrying the GPU', async () => {
  vi.stubGlobal('navigator', {gpu: {}})
  const error = failureResult({
    code: 'download-failed' as const,
    fileName: 'model',
    phase: 'download' as const,
    retryable: true,
    status: 503,
  })
  vi.mocked(loadSessions).mockResolvedValue(error)
  const loader = createModelSessions()
  await expect(loader.load(options())).resolves.toEqual(error)
  await loader.load(options())
  expect(vi.mocked(loadSessions).mock.calls.map(([value]) => value.backend)).toEqual([
    'webgpu',
    'webgpu',
  ])
})
it('should use CPU after a GPU execution failure is reported', async () => {
  vi.stubGlobal('navigator', {gpu: {}})
  vi.mocked(loadSessions).mockResolvedValue(successResult(sessions()))
  const loader = createModelSessions()
  await loader.load(options())
  loader.disableGpu('full')
  await expect(loader.load(options())).resolves.toMatchObject({ok: true, value: {backend: 'wasm'}})
})

it('should bypass GPU entirely when explicitly disabled and probe only when enabled later', async () => {
  const gpu = vi.fn(() => ({}))
  vi.stubGlobal('navigator', {
    get gpu() {
      return gpu()
    },
  })
  vi.mocked(loadSessions).mockResolvedValue(successResult(sessions()))
  const loader = createModelSessions()
  await expect(loader.load({...options(), gpu: false})).resolves.toMatchObject({
    ok: true,
    value: {backend: 'wasm'},
  })
  expect(gpu).not.toHaveBeenCalled()
  await expect(loader.load({...options(), gpu: true})).resolves.toMatchObject({
    ok: true,
    value: {backend: 'webgpu'},
  })
  expect(gpu).toHaveBeenCalledOnce()
})
