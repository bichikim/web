import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import type {CacheStore} from '../cache-store'
import {createStrategyHandlers} from '../strategies'
import type {Logger, ServiceWorkerFetchEvent} from '../types'

const createFetchEvent = (url: string) => {
  const waitUntil = vi.fn<(promise: Promise<unknown>) => void>()
  const event = {
    request: new Request(url),
    waitUntil,
  } as unknown as ServiceWorkerFetchEvent

  return {event, waitUntil}
}

describe('createStrategyHandlers', () => {
  let cacheStore: CacheStore
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>
  let get: ReturnType<typeof vi.fn<CacheStore['get']>>
  let log: ReturnType<typeof vi.fn<Logger>>
  let put: ReturnType<typeof vi.fn<CacheStore['put']>>

  beforeEach(() => {
    fetchMock = vi.fn<typeof fetch>()
    get = vi.fn<CacheStore['get']>()
    log = vi.fn<Logger>()
    put = vi.fn<CacheStore['put']>()
    cacheStore = {get, put}
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should cache a successful network-first response', async () => {
    const networkResponse = new Response('network')
    const {event} = createFetchEvent('https://example.com/app.js')
    const handlers = createStrategyHandlers({cacheStore, log})

    fetchMock.mockResolvedValue(networkResponse)

    const response = await handlers['network-first'](event, 'script')

    expect(response).toBe(networkResponse)
    expect(put).toHaveBeenCalledWith(event.request, networkResponse, 'script')
  })

  it('should return a cached response after a network-first failure', async () => {
    const cachedResponse = new Response('cached')
    const {event} = createFetchEvent('https://example.com/app.js')
    const handlers = createStrategyHandlers({cacheStore, log})

    fetchMock.mockRejectedValue(new Error('offline'))
    get.mockResolvedValue(cachedResponse)

    const response = await handlers['network-first'](event, 'script')

    expect(response).toBe(cachedResponse)
    expect(log).toHaveBeenCalledWith(
      'error',
      'Network request failed',
      expect.objectContaining({error: 'offline'}),
    )
    expect(log).toHaveBeenCalledWith('info', 'Served from cache after network error', {
      url: event.request.url,
    })
  })

  it('should return 503 when network and cache fallback fail', async () => {
    const {event} = createFetchEvent('https://example.com/app.js')
    const handlers = createStrategyHandlers({cacheStore, log})

    fetchMock.mockRejectedValue(new Error('offline'))
    get.mockRejectedValue(new Error('cache unavailable'))

    const response = await handlers['network-first'](event, 'script')

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toMatchObject({
      error: 'Network request failed',
      url: event.request.url,
    })
    expect(log).toHaveBeenCalledWith('error', 'Cache fallback also failed', {
      error: 'cache unavailable',
    })
  })

  it('should return 503 when the cache has no fallback response', async () => {
    const {event} = createFetchEvent('https://example.com/app.js')
    const handlers = createStrategyHandlers({cacheStore, log})

    fetchMock.mockRejectedValue(new Error('offline'))
    get.mockResolvedValue(undefined)

    const response = await handlers['network-first'](event, 'script')

    expect(response.status).toBe(503)
    expect(log).not.toHaveBeenCalledWith('error', 'Cache fallback also failed', expect.anything())
  })

  it('should return a cache-first hit without fetching', async () => {
    const cachedResponse = new Response('cached')
    const {event} = createFetchEvent('https://example.com/image.png')
    const handlers = createStrategyHandlers({cacheStore, log})

    get.mockResolvedValue(cachedResponse)

    const response = await handlers['cache-first'](event, 'image')

    expect(response).toBe(cachedResponse)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('should fetch and cache a cache-first miss', async () => {
    const networkResponse = new Response('network')
    const {event} = createFetchEvent('https://example.com/image.png')
    const handlers = createStrategyHandlers({cacheStore, log})

    get.mockResolvedValue(undefined)
    fetchMock.mockResolvedValue(networkResponse)

    const response = await handlers['cache-first'](event, 'image')

    expect(response).toBe(networkResponse)
    expect(put).toHaveBeenCalledWith(event.request, networkResponse, 'image')
  })

  it('should keep a stale-while-revalidate refresh alive', async () => {
    const cachedResponse = new Response('cached')
    const networkResponse = new Response('network')
    const {event, waitUntil} = createFetchEvent('https://example.com/image.png')
    const handlers = createStrategyHandlers({cacheStore, log})

    get.mockResolvedValue(cachedResponse)
    fetchMock.mockResolvedValue(networkResponse)

    const response = await handlers['stale-while-revalidate'](event, 'image')

    expect(response).toBe(cachedResponse)
    expect(waitUntil).toHaveBeenCalledWith(expect.any(Promise))

    const refreshPromise = waitUntil.mock.calls[0]?.[0]

    await refreshPromise
    expect(put).toHaveBeenCalledWith(event.request, networkResponse, 'image')
  })

  it('should retry stale-while-revalidate when the initial request fails without cache', async () => {
    const retryResponse = new Response('retry')
    const {event} = createFetchEvent('https://example.com/image.png')
    const handlers = createStrategyHandlers({cacheStore, log})

    get.mockResolvedValue(undefined)
    fetchMock.mockRejectedValueOnce('offline').mockResolvedValueOnce(retryResponse)

    const response = await handlers['stale-while-revalidate'](event, 'image')

    expect(response).toBe(retryResponse)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(log).toHaveBeenCalledWith(
      'warn',
      'Background refresh failed',
      expect.objectContaining({error: 'offline'}),
    )
  })

  it('should delegate network-only requests directly to fetch', async () => {
    const networkResponse = new Response('network')
    const {event} = createFetchEvent('https://example.com/data.json')
    const handlers = createStrategyHandlers({cacheStore, log})

    fetchMock.mockResolvedValue(networkResponse)

    await expect(handlers['network-only'](event)).resolves.toBe(networkResponse)
    expect(fetchMock).toHaveBeenCalledWith(event.request)
  })
})
