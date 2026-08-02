import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {registerFetchHandler} from '../routing'
import type {StrategyHandlers} from '../strategies'
import type {CacheDestination, ServiceWorkerFetchEvent} from '../types'

interface FetchListenerEvent {
  request: Request
  respondWith: (response: Promise<Response>) => void
}

type FetchListener = (event: FetchListenerEvent) => void

describe('registerFetchHandler', () => {
  const cacheFirst =
    vi.fn<(event: ServiceWorkerFetchEvent, destination: CacheDestination) => Promise<Response>>()
  const listeners = new Map<string, FetchListener>()
  const networkFirst =
    vi.fn<(event: ServiceWorkerFetchEvent, destination: CacheDestination) => Promise<Response>>()
  const networkOnly = vi.fn<(event: ServiceWorkerFetchEvent) => Promise<Response>>()
  const staleWhileRevalidate =
    vi.fn<(event: ServiceWorkerFetchEvent, destination: CacheDestination) => Promise<Response>>()

  const strategyHandlers: StrategyHandlers = {
    'cache-first': cacheFirst,
    'network-first': networkFirst,
    'network-only': networkOnly,
    'stale-while-revalidate': staleWhileRevalidate,
  }

  const createRequest = (url: string, method = 'GET', destination = '') => {
    const request = new Request(url, {method})

    Object.defineProperty(request, 'destination', {value: destination})

    return request
  }

  const dispatchFetch = (request: Request) => {
    const respondWith = vi.fn<(response: Promise<Response>) => void>()

    listeners.get('fetch')?.({request, respondWith})

    return respondWith
  }

  beforeEach(() => {
    listeners.clear()
    vi.clearAllMocks()
    cacheFirst.mockResolvedValue(new Response('cache'))
    networkFirst.mockResolvedValue(new Response('network'))
    networkOnly.mockResolvedValue(new Response('network'))
    staleWhileRevalidate.mockResolvedValue(new Response('stale'))

    vi.stubGlobal('self', {
      addEventListener: (type: string, listener: FetchListener) => {
        listeners.set(type, listener)
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should use the default cache-first strategy for an empty destination', () => {
    registerFetchHandler({
      origin: 'https://example.com',
      strategies: {default: 'cache-first'},
      strategyHandlers,
    })

    const request = createRequest('https://example.com/data')
    const respondWith = dispatchFetch(request)

    expect(cacheFirst).toHaveBeenCalledWith(expect.objectContaining({request}), 'default')
    expect(respondWith).toHaveBeenCalledWith(expect.any(Promise))
  })

  it('should fall back to cache-first when no strategy is configured', () => {
    registerFetchHandler({
      origin: 'https://example.com',
      strategies: {},
      strategyHandlers,
    })

    const request = createRequest('https://example.com/data')

    dispatchFetch(request)

    expect(cacheFirst).toHaveBeenCalledWith(expect.objectContaining({request}), 'default')
  })

  it('should select the configured destination strategy', () => {
    registerFetchHandler({
      origin: 'https://example.com',
      strategies: {default: 'cache-first', image: 'stale-while-revalidate'},
      strategyHandlers,
    })

    const request = createRequest('https://example.com/image.png', 'GET', 'image')

    dispatchFetch(request)

    expect(staleWhileRevalidate).toHaveBeenCalledWith(expect.objectContaining({request}), 'image')
  })

  it('should invoke network-only without a destination argument', () => {
    registerFetchHandler({
      origin: 'https://example.com',
      strategies: {default: 'network-only'},
      strategyHandlers,
    })

    const request = createRequest('https://example.com/data.json')

    dispatchFetch(request)

    expect(networkOnly).toHaveBeenCalledWith(expect.objectContaining({request}))
  })

  it.each([
    {label: 'non-GET', request: createRequest('https://example.com/data', 'POST')},
    {label: 'cross-origin', request: createRequest('https://other.example/data')},
    {label: 'API', request: createRequest('https://example.com/api/items')},
    {label: 'instrument', request: createRequest('https://example.com/instruments/piano.ogg')},
    {label: 'Vercel internal', request: createRequest('https://example.com/_vercel/insights.js')},
  ])('should ignore $label requests', ({request}) => {
    registerFetchHandler({
      origin: 'https://example.com',
      strategies: {default: 'cache-first'},
      strategyHandlers,
    })

    const respondWith = dispatchFetch(request)

    expect(respondWith).not.toHaveBeenCalled()
  })
})
