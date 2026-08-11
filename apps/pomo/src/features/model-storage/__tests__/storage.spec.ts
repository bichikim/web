import {describe, expect, it, vi} from 'vitest'

import {createModelStorage, MODEL_CACHE_NAME} from '../storage'

const createCache = () => ({
  delete: vi.fn(async () => true),
  match: vi.fn(async (_request: RequestInfo | URL): Promise<Response | undefined> => undefined),
  put: vi.fn(async () => undefined),
})

describe('createModelStorage', () => {
  it('should use the shared legacy cache namespace', async () => {
    const cache = createCache()
    const cacheStorage = {open: vi.fn(async () => cache)}
    const storage = createModelStorage({cacheStorage})

    await storage.get('https://models.test/model.onnx')

    expect(cacheStorage.open).toHaveBeenCalledWith(MODEL_CACHE_NAME)
  })

  it('should read, write, and delete model responses', async () => {
    const storedResponse = new Response('model')
    const cache = createCache()
    cache.match.mockResolvedValue(storedResponse)
    const storage = createModelStorage({cacheStorage: {open: vi.fn(async () => cache)}})
    const response = new Response('next model')

    const readResult = await storage.get('model')
    const writeResult = await storage.set('model', response)
    const deleteResult = await storage.delete('model')

    expect(readResult).toEqual({ok: true, value: storedResponse})
    expect(writeResult).toEqual({ok: true, value: undefined})
    expect(deleteResult).toEqual({ok: true, value: true})
    expect(cache.put).toHaveBeenCalledWith('model', response)
  })

  it('should return an open failure when the Cache API is unavailable', async () => {
    const storage = createModelStorage({cacheStorage: null})

    const result = await storage.get('model')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.operation).toBe('open')
    }
  })

  it('should normalize cache operation failures', async () => {
    const cause = new Error('storage full')
    const cache = createCache()
    cache.put.mockRejectedValue(cause)
    const storage = createModelStorage({cacheStorage: {open: vi.fn(async () => cache)}})

    const result = await storage.set('model', new Response('model'))

    expect(result).toEqual({error: {cause, operation: 'write'}, ok: false})
  })
})
