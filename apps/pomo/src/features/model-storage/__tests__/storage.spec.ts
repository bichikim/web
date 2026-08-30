import {describe, expect, it, vi} from 'vitest'

import {
  createModelStorage,
  MODEL_CACHE_NAME,
  MODEL_PARTIAL_DIRECTORY_NAME,
  reportModelStorageError,
} from '../storage'

const createCache = () => ({
  delete: vi.fn(async () => true),
  match: vi.fn(async (_request: RequestInfo | URL): Promise<Response | undefined> => undefined),
  put: vi.fn(async () => undefined),
})

describe('createModelStorage', () => {
  it('should expose the shared partial download namespace', () => {
    expect(MODEL_PARTIAL_DIRECTORY_NAME).toBe('pomo-model-downloads')
  })

  it('should use the shared legacy cache namespace', async () => {
    const cache = createCache()
    const cacheStorage = {open: vi.fn(async () => cache)}
    const storage = createModelStorage({cacheStorage})

    await storage.get('https://models.test/model.onnx')

    expect(cacheStorage.open).toHaveBeenCalledWith(MODEL_CACHE_NAME)
  })

  it('should use the platform cache with a custom namespace by default', async () => {
    const cache = createCache()
    const open = vi.fn(async () => cache)
    vi.stubGlobal('caches', {open})
    const storage = createModelStorage({cacheName: 'custom-cache'})

    await expect(storage.get('missing')).resolves.toEqual({ok: true, value: null})
    expect(open).toHaveBeenCalledWith('custom-cache')
    vi.unstubAllGlobals()
  })

  it('should report a missing default Cache API', async () => {
    Reflect.deleteProperty(globalThis, 'caches')
    const storage = createModelStorage()

    await expect(storage.get('model')).resolves.toMatchObject({
      error: {operation: 'open'},
      ok: false,
    })
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

    await expect(storage.delete('model')).resolves.toMatchObject({ok: false})
    await expect(storage.set('model', new Response())).resolves.toMatchObject({ok: false})
  })

  it('should normalize cache opening failures', async () => {
    const cause = new Error('open failed')
    const storage = createModelStorage({
      cacheStorage: {open: vi.fn(async () => Promise.reject(cause))},
    })

    await expect(storage.get('model')).resolves.toEqual({
      error: {cause, operation: 'open'},
      ok: false,
    })
  })

  it('should normalize cache operation failures', async () => {
    const cause = new Error('storage full')
    const cache = createCache()
    cache.put.mockRejectedValue(cause)
    const storage = createModelStorage({cacheStorage: {open: vi.fn(async () => cache)}})

    const result = await storage.set('model', new Response('model'))

    expect(result).toEqual({error: {cause, operation: 'write'}, ok: false})
  })

  it('should normalize cache read and delete failures', async () => {
    const readCause = new Error('read failed')
    const deleteCause = new Error('delete failed')
    const cache = createCache()
    cache.match.mockRejectedValue(readCause)
    cache.delete.mockRejectedValue(deleteCause)
    const storage = createModelStorage({cacheStorage: {open: vi.fn(async () => cache)}})

    await expect(storage.get('model')).resolves.toEqual({
      error: {cause: readCause, operation: 'read'},
      ok: false,
    })
    await expect(storage.delete('model')).resolves.toEqual({
      error: {cause: deleteCause, operation: 'delete'},
      ok: false,
    })
  })

  it('should log model storage errors with their operation', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const cause = new Error('failed')

    reportModelStorageError({cause, operation: 'read'})

    expect(warn).toHaveBeenCalledWith('Model cache read failed.', cause)
  })
})
