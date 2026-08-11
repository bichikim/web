import {describe, expect, it, vi} from 'vitest'

import {loadModelResource} from '../resource'
import {failureResult, successResult} from '../result'
import type {ModelStorage} from '../storage'

const createStorage = (): ModelStorage => ({
  delete: vi.fn(async () => successResult(true)),
  get: vi.fn(async () => successResult(null)),
  set: vi.fn(async () => successResult(undefined)),
})

describe('loadModelResource', () => {
  it('should return a cached model without using the network', async () => {
    const response = new Response('cached model')
    const storage = createStorage()
    storage.get = vi.fn(async () => successResult(response))
    const fetcher = vi.fn<typeof fetch>()

    const resource = await loadModelResource({fetcher, storage, url: 'model'})

    expect(resource.response).toBe(response)
    expect(resource.source).toBe('cache')
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('should fetch and cache a missing model resource', async () => {
    const storage = createStorage()
    const response = new Response('downloaded model')
    const fetcher = vi.fn<typeof fetch>(async () => response)

    const resource = await loadModelResource({fetcher, storage, url: 'model'})
    const cacheResult = await resource.cacheWrite

    expect(resource.source).toBe('network')
    expect(fetcher).toHaveBeenCalledWith('model', {cache: 'no-store', signal: undefined})
    expect(storage.set).toHaveBeenCalledTimes(1)
    expect(cacheResult).toEqual({ok: true, value: undefined})
  })

  it('should continue with the network and report a cache read failure', async () => {
    const storage = createStorage()
    const error = {cause: new Error('cache failed'), operation: 'read' as const}
    storage.get = vi.fn(async () => failureResult(error))
    const onStorageError = vi.fn()
    const fetcher = vi.fn<typeof fetch>(async () => new Response('downloaded model'))

    const resource = await loadModelResource({
      fetcher,
      onStorageError,
      storage,
      url: 'model',
    })

    expect(resource.source).toBe('network')
    expect(onStorageError).toHaveBeenCalledWith(error)
  })

  it('should not cache unsuccessful network responses', async () => {
    const storage = createStorage()
    const fetcher = vi.fn<typeof fetch>(async () => new Response(null, {status: 503}))

    const resource = await loadModelResource({fetcher, storage, url: 'model'})
    await resource.cacheWrite

    expect(storage.set).not.toHaveBeenCalled()
  })
})
