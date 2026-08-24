import {describe, expect, it, vi} from 'vitest'

import type {ModelStorage} from '../storage'
import {failureResult, successResult} from '../../result'
import {createTransformersModelCache} from '../transformers'

const createStorage = (): ModelStorage => ({
  delete: vi.fn(async () => successResult(true)),
  get: vi.fn(async () => successResult(null)),
  set: vi.fn(async () => successResult(undefined)),
})

describe('createTransformersModelCache', () => {
  it('should adapt model storage to the Transformers cache contract', async () => {
    const response = new Response('model')
    const storage = createStorage()
    storage.get = vi.fn(async () => successResult(response))
    const cache = createTransformersModelCache({storage})

    expect(await cache.match('model')).toBe(response)
    await expect(cache.put('model', response)).resolves.toBeUndefined()
    await expect(cache.delete('model')).resolves.toBe(true)
  })

  it('should report storage failures without failing model loading', async () => {
    const storage = createStorage()
    const error = {cause: new Error('quota exceeded'), operation: 'write' as const}
    storage.set = vi.fn(async () => failureResult(error))
    const onError = vi.fn()
    const cache = createTransformersModelCache({onError, storage})

    await expect(cache.put('model', new Response('model'))).resolves.toBeUndefined()

    expect(onError).toHaveBeenCalledWith(error)
  })

  it('should remove a partial download after the complete response is stored', async () => {
    const storage = createStorage()
    const onStored = vi.fn(async () => undefined)
    const cache = createTransformersModelCache({onStored, storage})

    await cache.put('https://models.test/model.onnx', new Response('model'))

    expect(onStored).toHaveBeenCalledWith('https://models.test/model.onnx')
  })

  it('should map storage keys without changing the completed download request', async () => {
    const storage = createStorage()
    const onStored = vi.fn(async () => undefined)
    const cache = createTransformersModelCache({
      getStorageKey: (request) => `${request}?cache-version=1`,
      onStored,
      storage,
    })

    await cache.match('https://models.test/tokenizer.json')
    await cache.put('https://models.test/tokenizer.json', new Response('tokenizer'))
    await cache.delete('https://models.test/tokenizer.json')

    expect(storage.get).toHaveBeenCalledWith('https://models.test/tokenizer.json?cache-version=1')
    expect(storage.set).toHaveBeenCalledWith(
      'https://models.test/tokenizer.json?cache-version=1',
      expect.any(Response),
    )
    expect(storage.delete).toHaveBeenNthCalledWith(1, 'https://models.test/tokenizer.json')
    expect(storage.delete).toHaveBeenNthCalledWith(
      2,
      'https://models.test/tokenizer.json?cache-version=1',
    )
    expect(onStored).toHaveBeenCalledWith('https://models.test/tokenizer.json')
  })

  it('should report legacy cache cleanup failures after storing the new entry', async () => {
    const storage = createStorage()
    const error = {cause: new Error('cache entry busy'), operation: 'delete' as const}
    storage.delete = vi.fn(async () => failureResult(error))
    const onError = vi.fn()
    const onStored = vi.fn(async () => undefined)
    const cache = createTransformersModelCache({
      getStorageKey: (request) => `${request}?cache-version=1`,
      onError,
      onStored,
      storage,
    })

    await expect(cache.put('tokenizer.json', new Response('tokenizer'))).resolves.toBeUndefined()

    expect(onError).toHaveBeenCalledWith(error)
    expect(onStored).toHaveBeenCalledWith('tokenizer.json')
  })
})
