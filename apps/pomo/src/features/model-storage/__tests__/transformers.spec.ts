import {describe, expect, it, vi} from 'vitest'

import type {ModelStorage} from '../storage'
import {failureResult, successResult} from '../result'
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
})
