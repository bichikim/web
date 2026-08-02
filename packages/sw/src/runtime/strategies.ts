import type {CacheStore} from './cache-store'
import type {CacheDestination, Logger, ServiceWorkerFetchEvent} from './types'

export interface StrategyHandlers {
  'cache-first': (
    event: ServiceWorkerFetchEvent,
    destination: CacheDestination,
  ) => Promise<Response>
  'network-first': (
    event: ServiceWorkerFetchEvent,
    destination: CacheDestination,
  ) => Promise<Response>
  'network-only': (event: ServiceWorkerFetchEvent) => Promise<Response>
  'stale-while-revalidate': (
    event: ServiceWorkerFetchEvent,
    destination: CacheDestination,
  ) => Promise<Response>
}

export interface StrategyOptions {
  cacheStore: CacheStore
  log: Logger
}

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error))

export const createStrategyHandlers = (options: StrategyOptions): StrategyHandlers => {
  const createNetworkFirst = async (
    event: ServiceWorkerFetchEvent,
    destination: CacheDestination,
  ): Promise<Response> => {
    try {
      const response = await fetch(event.request)

      await options.cacheStore.put(event.request, response, destination)

      return response
    } catch (error) {
      options.log('error', 'Network request failed', {
        error: getErrorMessage(error),
        method: event.request.method,
        url: event.request.url,
      })

      try {
        const response = await options.cacheStore.get(event.request, destination)

        if (response) {
          options.log('info', 'Served from cache after network error', {url: event.request.url})

          return response
        }
      } catch (cacheError) {
        options.log('error', 'Cache fallback also failed', {error: getErrorMessage(cacheError)})
      }

      return new Response(
        JSON.stringify({
          error: 'Network request failed',
          message: 'Unable to fetch resource and no cached version available',
          timestamp: new Date().toISOString(),
          url: event.request.url,
        }),
        {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Content-Type': 'application/json',
          },
          status: 503,
          statusText: 'Service Unavailable',
        },
      )
    }
  }

  const createCacheFirst = async (
    event: ServiceWorkerFetchEvent,
    destination: CacheDestination,
  ): Promise<Response> => {
    const cachedResponse = await options.cacheStore.get(event.request, destination)

    if (cachedResponse) {
      return cachedResponse
    }

    const response = await fetch(event.request)

    await options.cacheStore.put(event.request, response, destination)

    return response
  }

  const createStaleWhileRevalidate = async (
    event: ServiceWorkerFetchEvent,
    destination: CacheDestination,
  ): Promise<Response> => {
    const cachedResponse = await options.cacheStore.get(event.request, destination)
    const updatePromise = fetch(event.request)
      .then(async (response) => {
        await options.cacheStore.put(event.request, response, destination)

        return response
      })
      .catch((error) => {
        options.log('warn', 'Background refresh failed', {
          error: getErrorMessage(error),
          url: event.request.url,
        })
      })

    if (cachedResponse) {
      event.waitUntil(updatePromise)

      return cachedResponse
    }

    const response = await updatePromise

    return response ?? fetch(event.request)
  }

  return {
    'cache-first': createCacheFirst,
    'network-first': createNetworkFirst,
    'network-only': (event) => fetch(event.request),
    'stale-while-revalidate': createStaleWhileRevalidate,
  }
}
