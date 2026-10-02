/** @vitest-environment node */
import {beforeEach, expect, it, vi} from 'vitest'

const engine = vi.hoisted(() => ({exit: vi.fn(), loadModel: vi.fn()}))
const mocks = {
  ...engine,
  deletePartial: vi.fn(),
  fetch: vi.fn(),
  get: vi.fn(),
  onStorageError: vi.fn(),
  set: vi.fn(),
}
vi.mock('@wllama/wllama/esm/index.js', () => ({
  Wllama: class {
    exit = engine.exit
    loadModel = engine.loadModel
  },
}))

import {loadGgufModel} from '../load-gguf-model'
import type {GgufTextModelImplementation} from '../model'

const model: GgufTextModelImplementation = {
  architecture: 'lfm-2-gguf',
  assetSource: {
    host: 'https://models.example',
    pathTemplate: '{model}/resolve/{revision}/',
    revision: 'main',
  },
  description: 'QAD',
  downloadSize: '1.6GB',
  id: 'lfm-2.6b-qad',
  label: 'QAD',
  quantization: 'q4_0',
  repositoryId: 'LiquidAI/LFM2.5-2.6B-GGUF',
  tokenizerSubfolder: 'qad',
  weightFile: 'LFM2.5-2.6B-QAD-Q4_0.gguf',
}
const url =
  'https://models.example/LiquidAI/LFM2.5-2.6B-GGUF/resolve/main/LFM2.5-2.6B-QAD-Q4_0.gguf'

const dependencies = {
  fetcher: mocks.fetch,
  onStorageError: mocks.onStorageError,
  storage: {get: mocks.get, set: mocks.set},
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.get.mockResolvedValue({ok: true, value: null})
  mocks.set.mockResolvedValue({ok: true})
  mocks.exit.mockResolvedValue(undefined)
})

it('should loads cached GGUF bytes without fetching the weights again', async () => {
  mocks.get.mockResolvedValue({ok: true, value: new Response('cached weights')})

  await loadGgufModel({...dependencies, model, onProgress: vi.fn()})

  expect(mocks.get).toHaveBeenCalledWith(url)
  expect(mocks.fetch).not.toHaveBeenCalled()
  expect(await mocks.loadModel.mock.calls[0]?.[0][0].text()).toBe('cached weights')
})

it('should downloads the exact checkpoint, reports byte progress, and stores its bytes', async () => {
  mocks.fetch.mockResolvedValue(new Response('gguf', {headers: {'content-length': '4'}}))
  const onProgress = vi.fn()

  await loadGgufModel({...dependencies, model, onProgress, onStored: mocks.deletePartial})

  expect(mocks.fetch).toHaveBeenCalledWith(url)
  expect(onProgress).toHaveBeenCalledWith(expect.objectContaining({loaded: 4, total: 4}))
  expect(mocks.set.mock.calls[0]?.[0]).toBe(url)
  expect(await mocks.set.mock.calls[0]?.[1].text()).toBe('gguf')
  expect(mocks.deletePartial).toHaveBeenCalledWith(url)
})

it('should removes a stale partial download when complete weights already exist', async () => {
  mocks.get.mockResolvedValue({ok: true, value: new Response('weights')})
  await loadGgufModel({...dependencies, model, onProgress: vi.fn(), onStored: mocks.deletePartial})
  expect(mocks.deletePartial).toHaveBeenCalledWith(url)
})

it('should preserves resumable bytes when the complete cache write fails', async () => {
  mocks.fetch.mockResolvedValue(new Response('weights'))
  mocks.set.mockResolvedValue({error: {cause: new Error('quota'), operation: 'write'}, ok: false})
  await loadGgufModel({...dependencies, model, onProgress: vi.fn(), onStored: mocks.deletePartial})
  expect(mocks.deletePartial).not.toHaveBeenCalled()
  expect(mocks.onStorageError).toHaveBeenCalledWith({cause: expect.any(Error), operation: 'write'})
})

it('should disposes an engine that failed to initialize and preserves the original error', async () => {
  mocks.get.mockResolvedValue({ok: true, value: new Response('weights')})
  const error = new Error('unsupported GPU')
  mocks.loadModel.mockRejectedValue(error)

  await expect(loadGgufModel({...dependencies, model, onProgress: vi.fn()})).rejects.toBe(error)
  expect(mocks.exit).toHaveBeenCalledOnce()
})
