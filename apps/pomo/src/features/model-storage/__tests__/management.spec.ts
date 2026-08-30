import {describe, expect, it, vi} from 'vitest'

import {createModelStorageManager} from '../management'
import {MODEL_PARTIAL_DIRECTORY_NAME} from '../storage'

const createCache = (urls: ReadonlyArray<string> = []) => ({
  delete: vi.fn(async () => true),
  keys: vi.fn(async () => urls.map((url) => new Request(url))),
})

const createDirectory = (kinds: ReadonlyArray<'directory' | 'file'>) => ({
  values: (): AsyncIterableIterator<{readonly kind: 'directory' | 'file'}> => {
    let index = 0

    return {
      [Symbol.asyncIterator]() {
        return this
      },
      async next() {
        const kind = kinds[index]
        index += 1
        return kind === undefined ? {done: true, value: undefined} : {done: false, value: {kind}}
      },
    }
  },
})

describe('createModelStorageManager', () => {
  it('should inspect sorted cache entries and owned partial files', async () => {
    const cache = createCache(['https://models.test/z.onnx', 'https://models.test/a.json'])
    const root = {
      getDirectoryHandle: vi.fn(async () => createDirectory(['file', 'directory', 'file'])),
      removeEntry: vi.fn(async () => undefined),
    }
    const manager = createModelStorageManager({
      cacheStorage: {delete: vi.fn(async () => true), open: vi.fn(async () => cache)},
      getStorageRoot: async () => root,
    })

    await expect(manager.inspect()).resolves.toEqual({
      ok: true,
      value: {
        cacheEntries: ['https://models.test/a.json', 'https://models.test/z.onnx'],
        partialFileCount: 2,
        partialStorageAvailable: true,
      },
    })
    expect(root.getDirectoryHandle).toHaveBeenCalledWith(MODEL_PARTIAL_DIRECTORY_NAME)
  })

  it('should treat an absent partial directory as empty', async () => {
    const manager = createModelStorageManager({
      cacheStorage: {
        delete: vi.fn(async () => true),
        open: vi.fn(async () => createCache()),
      },
      getStorageRoot: async () => ({
        getDirectoryHandle: vi.fn(async () => {
          const error = new Error('missing')
          error.name = 'NotFoundError'
          return Promise.reject(error)
        }),
        removeEntry: vi.fn(async () => undefined),
      }),
    })

    await expect(manager.inspect()).resolves.toMatchObject({
      ok: true,
      value: {partialFileCount: 0},
    })
  })

  it('should delete one cache entry and both owned storage namespaces', async () => {
    const cache = createCache()
    const deleteCache = vi.fn(async () => true)
    const removeEntry = vi.fn(async () => undefined)
    const manager = createModelStorageManager({
      cacheStorage: {delete: deleteCache, open: vi.fn(async () => cache)},
      getStorageRoot: async () => ({
        getDirectoryHandle: vi.fn(async () => createDirectory([])),
        removeEntry,
      }),
    })

    await expect(manager.deleteCacheEntry('https://models.test/model.onnx')).resolves.toEqual({
      ok: true,
      value: true,
    })
    await expect(manager.clearCache()).resolves.toEqual({ok: true, value: true})
    await expect(manager.clearPartialDownloads()).resolves.toEqual({ok: true, value: true})

    expect(cache.delete).toHaveBeenCalledWith('https://models.test/model.onnx')
    expect(deleteCache).toHaveBeenCalledWith('transformers-cache')
    expect(removeEntry).toHaveBeenCalledWith(MODEL_PARTIAL_DIRECTORY_NAME, {recursive: true})
  })

  it('should normalize unavailable storage and operation failures', async () => {
    const unavailable = createModelStorageManager({cacheStorage: null, getStorageRoot: null})

    await expect(unavailable.inspect()).resolves.toMatchObject({
      error: {operation: 'inspect'},
      ok: false,
    })
    await expect(unavailable.deleteCacheEntry('model')).resolves.toMatchObject({
      error: {operation: 'delete-entry'},
      ok: false,
    })
    await expect(unavailable.clearCache()).resolves.toMatchObject({
      error: {operation: 'clear-cache'},
      ok: false,
    })
    await expect(unavailable.clearPartialDownloads()).resolves.toMatchObject({
      error: {operation: 'clear-partials'},
      ok: false,
    })

    const cause = new Error('blocked')
    const failing = createModelStorageManager({
      cacheStorage: {
        delete: vi.fn(async () => Promise.reject(cause)),
        open: vi.fn(async () => Promise.reject(cause)),
      },
      getStorageRoot: async () => Promise.reject(cause),
    })

    await expect(failing.inspect()).resolves.toEqual({
      error: {cause, operation: 'inspect'},
      ok: false,
    })
    await expect(failing.deleteCacheEntry('model')).resolves.toEqual({
      error: {cause, operation: 'delete-entry'},
      ok: false,
    })
    await expect(failing.clearCache()).resolves.toEqual({
      error: {cause, operation: 'clear-cache'},
      ok: false,
    })
    await expect(failing.clearPartialDownloads()).resolves.toEqual({
      error: {cause, operation: 'clear-partials'},
      ok: false,
    })
  })
})
