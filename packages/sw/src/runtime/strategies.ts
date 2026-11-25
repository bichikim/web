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

const unavailableResponse = (request: Request): Response =>
  new Response(
    JSON.stringify({
      error: 'Network request failed',
      message: 'Unable to fetch resource and no cached version available',
      timestamp: new Date().toISOString(),
      url: request.url,
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

export const createStrategyHandlers = (options: StrategyOptions): StrategyHandlers => {
  const cacheResponse = (
    event: ServiceWorkerFetchEvent,
    response: Response,
    destination: CacheDestination,
  ): void => {
    event.waitUntil(
      options.cacheStore.put(event.request, response, destination).catch((error) => {
        options.log('warn', 'Failed to cache network response', {
          error: getErrorMessage(error),
          url: event.request.url,
        })
      }),
    )
  }

  const logNetworkError = (request: Request, error: unknown) => {
    options.log('error', 'Network request failed', {
      error: getErrorMessage(error),
      method: request.method,
      url: request.url,
    })
  }

  const fetchAndCache = async (event: ServiceWorkerFetchEvent, destination: CacheDestination) => {
    const response = await fetch(event.request)
    cacheResponse(event, response, destination)
    return response
  }

  const unavailableAfter = (request: Request, error: unknown) => {
    logNetworkError(request, error)
    return unavailableResponse(request)
  }

  const fetchNetworkFirst = async (
    event: ServiceWorkerFetchEvent,
    destination: CacheDestination,
  ): Promise<Response> => {
    try {
      return await fetchAndCache(event, destination)
    } catch (error) {
      logNetworkError(event.request, error)

      try {
        const response = await options.cacheStore.get(event.request, destination)

        if (response) {
          options.log('info', 'Served from cache after network error', {url: event.request.url})

          return response
        }
      } catch (cacheError) {
        options.log('error', 'Cache fallback also failed', {error: getErrorMessage(cacheError)})
      }

      return unavailableResponse(event.request)
    }
  }

  const fetchCacheFirst = async (
    event: ServiceWorkerFetchEvent,
    destination: CacheDestination,
  ): Promise<Response> => {
    const cachedResponse = await options.cacheStore.get(event.request, destination)

    if (cachedResponse) {
      return cachedResponse
    }

    return fetchAndCache(event, destination).catch((error) =>
      unavailableAfter(event.request, error),
    )
  }

  const fetchWithRevalidation = async (
    event: ServiceWorkerFetchEvent,
    destination: CacheDestination,
  ): Promise<Response> => {
    const cachedResponse = await options.cacheStore.get(event.request, destination)
    const updatePromise = fetchAndCache(event, destination).catch((error) => {
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

    return response ?? fetch(event.request).catch((error) => unavailableAfter(event.request, error))
  }

  return {
    'cache-first': fetchCacheFirst,
    'network-first': fetchNetworkFirst,
    'network-only': (event) => fetch(event.request),
    'stale-while-revalidate': fetchWithRevalidation,
  }
}
