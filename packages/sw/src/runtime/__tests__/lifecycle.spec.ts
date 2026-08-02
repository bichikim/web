import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {type LifecycleOptions, registerLifecycleHandlers} from '../lifecycle'
import type {Logger} from '../types'

interface TestEvent {
  data?: unknown
  waitUntil: (promise: Promise<unknown>) => void
}

type TestListener = (event: TestEvent) => void

describe('registerLifecycleHandlers', () => {
  const addAll = vi.fn<(requests: RequestInfo[]) => Promise<void>>()
  const cacheDelete = vi.fn<(cacheName: string) => Promise<boolean>>()
  const cacheKeys = vi.fn<() => Promise<string[]>>()
  const cacheOpen = vi.fn<(cacheName: string) => Promise<Pick<Cache, 'addAll'>>>()
  const claim = vi.fn<() => Promise<void>>()
  const listeners = new Map<string, TestListener>()
  const log = vi.fn<Logger>()
  const notifyClients = vi.fn<(message: Record<string, unknown>) => Promise<void>>()
  const skipWaiting = vi.fn<() => Promise<void>>()

  const options: LifecycleOptions = {
    appFiles: ['/app.js', '/style.css'],
    cacheMetadataName: 'coong-cache-v2-meta',
    cacheName: 'coong-cache-v2',
    cacheNamePrefix: 'coong-cache',
    cacheVersion: 2,
    log,
    notifyClients,
  }

  const invokeWithWaitUntil = async (listener: TestListener, data?: unknown): Promise<void> => {
    let task: Promise<unknown> | undefined

    listener({
      data,
      waitUntil: (promise) => {
        task = promise
      },
    })

    await task
  }

  beforeEach(() => {
    listeners.clear()
    vi.clearAllMocks()
    addAll.mockResolvedValue(undefined)
    cacheDelete.mockResolvedValue(true)
    cacheKeys.mockResolvedValue([])
    cacheOpen.mockResolvedValue({addAll})
    claim.mockResolvedValue(undefined)
    notifyClients.mockResolvedValue(undefined)
    skipWaiting.mockResolvedValue(undefined)

    vi.stubGlobal('caches', {
      delete: cacheDelete,
      keys: cacheKeys,
      open: cacheOpen,
    })
    vi.stubGlobal('self', {
      addEventListener: (type: string, listener: TestListener) => {
        listeners.set(type, listener)
      },
      clients: {claim},
      skipWaiting,
    })

    registerLifecycleHandlers(options)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should precache app files during installation', async () => {
    const installListener = listeners.get('install')

    expect(installListener).toBeDefined()
    await invokeWithWaitUntil(installListener as TestListener)

    expect(cacheOpen).toHaveBeenCalledWith(options.cacheName)
    expect(addAll).toHaveBeenCalledWith(options.appFiles)
    expect(log).toHaveBeenCalledWith('info', 'Installing cache', {files: 2, version: 2})
  })

  it('should delete old owned caches and notify clients during activation', async () => {
    cacheKeys.mockResolvedValue([
      options.cacheName,
      options.cacheMetadataName,
      'coong-cache-v1',
      'unrelated-cache',
    ])

    const activateListener = listeners.get('activate')

    expect(activateListener).toBeDefined()
    await invokeWithWaitUntil(activateListener as TestListener)

    expect(cacheDelete).toHaveBeenCalledTimes(1)
    expect(cacheDelete).toHaveBeenCalledWith('coong-cache-v1')
    expect(claim).toHaveBeenCalledOnce()
    expect(notifyClients).toHaveBeenCalledWith({type: 'SW_ACTIVATED', version: 2})
  })

  it('should clear only caches owned by the service worker', async () => {
    cacheKeys.mockResolvedValue([
      options.cacheName,
      options.cacheMetadataName,
      'coong-cache-v1',
      'unrelated-cache',
    ])

    const messageListener = listeners.get('message')

    expect(messageListener).toBeDefined()
    await invokeWithWaitUntil(messageListener as TestListener, {type: 'CLEAR_CACHE'})

    expect(cacheDelete.mock.calls.map(([cacheName]) => cacheName).sort()).toEqual([
      'coong-cache-v1',
      'coong-cache-v2',
      'coong-cache-v2-meta',
    ])
  })

  it('should skip waiting when requested by a client', () => {
    const messageListener = listeners.get('message')

    expect(messageListener).toBeDefined()
    messageListener?.({data: {type: 'SKIP_WAITING'}, waitUntil: vi.fn()})

    expect(skipWaiting).toHaveBeenCalledOnce()
    expect(log).toHaveBeenCalledWith('info', 'Received skip waiting message')
  })

  it('should ignore empty and unknown client messages', () => {
    const messageListener = listeners.get('message')
    const waitUntil = vi.fn()

    messageListener?.({waitUntil})
    messageListener?.({data: {type: 'UNKNOWN'}, waitUntil})

    expect(skipWaiting).not.toHaveBeenCalled()
    expect(waitUntil).not.toHaveBeenCalled()
  })
})
