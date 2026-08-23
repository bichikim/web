import {describe, expect, it, vi} from 'vitest'

import type {ModelStorage} from '../../model-storage'
import {successResult} from '../../model-storage/result'
import {isTextModelDownloaded} from '../download'

const createStorage = (): ModelStorage => ({
  delete: vi.fn(async () => successResult(false)),
  get: vi.fn(async () => successResult(new Response('model'))),
  set: vi.fn(async () => successResult(undefined)),
})

describe('isTextModelDownloaded', () => {
  it('should require every Gemma model weight file to be stored', async () => {
    const storage = createStorage()

    await expect(isTextModelDownloaded({modelId: 'gemma-4-e2b', storage})).resolves.toBe(true)
    expect(storage.get).toHaveBeenCalledTimes(4)
    expect(storage.get).toHaveBeenCalledWith(
      'https://storage.pomofi.io/models/text-generation/onnx-community/gemma-4-E2B-it-ONNX/9f4bef82ea6e296bc69f8a2f5939f73af81b07a6/onnx/embed_tokens_q4.onnx',
    )
    expect(storage.get).toHaveBeenCalledWith(
      'https://storage.pomofi.io/models/text-generation/onnx-community/gemma-4-E2B-it-ONNX/9f4bef82ea6e296bc69f8a2f5939f73af81b07a6/onnx/decoder_model_merged_q4.onnx_data',
    )
  })

  it('should report a missing or unreadable model weight as not downloaded', async () => {
    const missingStorage = createStorage()
    vi.mocked(missingStorage.get).mockResolvedValueOnce(successResult(null))

    await expect(
      isTextModelDownloaded({modelId: 'gemma-4-e2b', storage: missingStorage}),
    ).resolves.toBe(false)

    const unreadableStorage = createStorage()
    vi.mocked(unreadableStorage.get).mockResolvedValueOnce({
      error: {cause: new Error('cache unavailable'), operation: 'read'},
      ok: false,
    })
    await expect(
      isTextModelDownloaded({modelId: 'gemma-4-e2b', storage: unreadableStorage}),
    ).resolves.toBe(false)
  })
})
