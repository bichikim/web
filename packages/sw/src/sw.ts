/// <reference types="@types/serviceworker" />
// oxlint-disable eslint-js/camelcase
/* eslint-disable max-lines */
/* eslint-disable no-console */

type CacheStrategy = 'network-first' | 'cache-first' | 'stale-while-revalidate' | 'network-only'
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'
type CacheStrategyConfig = Partial<Record<RequestDestination | 'default', CacheStrategy>>
type CachePriorityConfig = Partial<Record<RequestDestination | 'default', number>>
interface ServiceWorkerConfig {
  cacheMaxAgeSeconds?: number
  cacheMaxEntries?: number
  cachePriorities?: CachePriorityConfig
  cacheStrategies?: CacheStrategyConfig
  logEndpoint?: string
  logLevel?: LogLevel
  logSampleRate?: number
}

interface CacheMetadataEntry {
  cachedAt: number
  destination: RequestDestination | 'default'
  lastAccessed: number
  priority: number
}

type CacheMetadata = Record<string, CacheMetadataEntry>

const DEFAULT_CACHE_STRATEGIES: CacheStrategyConfig = {
  default: 'cache-first',
  document: 'network-first',
  font: 'stale-while-revalidate',
  image: 'stale-while-revalidate',
  manifest: 'network-first',
  script: 'network-first',
  style: 'network-first',
  worker: 'network-first',
}

const DEFAULT_CACHE_PRIORITIES: CachePriorityConfig = {
  default: 1,
  document: 4,
  font: 2,
  image: 2,
  manifest: 3,
  script: 4,
  style: 4,
  worker: 4,
}

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  error: 40,
  info: 20,
  silent: 50,
  warn: 30,
}

const APP_FILE_PRIORITY = 10

// Default cache name - can be overridden during build
declare const __CACHE_NAME__: string | undefined

declare const __CACHE_VERSION__: number | undefined

declare const __SW_CONFIG__: ServiceWorkerConfig | undefined

declare const __SW_ENV__: 'development' | 'production' | undefined
// eslint-disable-next-line camelcase
declare const __inject_code__: string[]

const CACHE_NAME = __CACHE_NAME__ === undefined ? 'coong-cache-v1' : __CACHE_NAME__
const CACHE_VERSION = __CACHE_VERSION__ === undefined ? 1 : __CACHE_VERSION__
const ENV = __SW_ENV__ === undefined ? 'production' : __SW_ENV__
const SW_CONFIG: ServiceWorkerConfig = __SW_CONFIG__ === undefined ? {} : __SW_CONFIG__

const MILLISECONDS_PER_SECOND = 1000

// Build-time injection: array of app asset paths used for precache.
// eslint-disable-next-line camelcase
const APP_FILES = __inject_code__
const {origin: originPath} = self.location
const apiPath = `${originPath}/api/`
const cacheMetadataName = `${CACHE_NAME}-meta`
const cacheMetadataUrl = `${originPath}/__sw_cache_metadata__`
const appFileUrls = new Set(APP_FILES.map((file) => new URL(file, originPath).toString()))

const resolvedCacheStrategies: CacheStrategyConfig = {
  ...DEFAULT_CACHE_STRATEGIES,
  ...SW_CONFIG.cacheStrategies,
}

const resolvedCachePriorities: CachePriorityConfig = {
  ...DEFAULT_CACHE_PRIORITIES,
  ...SW_CONFIG.cachePriorities,
}
const resolvedLogLevel: LogLevel = SW_CONFIG.logLevel ?? (ENV === 'development' ? 'debug' : 'error')
const resolvedLogEndpoint = SW_CONFIG.logEndpoint

const resolvedLogSampleRate =
  typeof SW_CONFIG.logSampleRate === 'number'
    ? Math.min(1, Math.max(0, SW_CONFIG.logSampleRate))
    : 1

const notifyClients = async (message: Record<string, unknown>) => {
  const clients = await self.clients.matchAll({includeUncontrolled: true, type: 'window'})

  for (const client of clients) {
    client.postMessage(message)
  }
}

const isOriginPath = (url: string) => url.startsWith(`${originPath}/`) || url === originPath

const isApiPath = (url: string) => url.startsWith(apiPath)
/**
 * Cache control header values for HTTP caching
 */
type CacheControlValue = 'no-cache' | 'no-store' | 'max-age=0' | 'must-revalidate'

/**
 * Network request options for fetch API
 */
interface NetworkRequestOptions {
  cache?: RequestCache
  headers?: HeadersInit
}

const shouldLog = (level: LogLevel) => {
  if (resolvedLogLevel === 'silent') {
    return false
  }

  return LOG_LEVEL_ORDER[level] >= LOG_LEVEL_ORDER[resolvedLogLevel]
}

const emitLog = (level: LogLevel, message: string, details?: Record<string, unknown>) => {
  if (!shouldLog(level)) {
    return
  }

  if (resolvedLogSampleRate < 1 && Math.random() > resolvedLogSampleRate) {
    return
  }

  const payload = {
    cacheVersion: CACHE_VERSION,
    details,
    level,
    message,
    timestamp: new Date().toISOString(),
  }

  switch (level) {
    case 'error': {
      console.error(message, details)

      break
    }

    case 'warn': {
      console.warn(message, details)

      break
    }

    case 'info': {
      console.info(message, details)

      break
    }

    default: {
      console.debug(message, details)
    }
  }

  if (ENV === 'development') {
    notifyClients({payload, type: 'SW_LOG'}).catch(() => null)
  }

  if (resolvedLogEndpoint) {
    fetch(resolvedLogEndpoint, {
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    }).catch(() => null)
  }
}

const readCacheMetadata = async (): Promise<CacheMetadata> => {
  const cache = await caches.open(cacheMetadataName)
  const response = await cache.match(cacheMetadataUrl)

  if (!response) {
    return {}
  }

  try {
    return (await response.json()) as CacheMetadata
  } catch {
    return {}
  }
}

const writeCacheMetadata = async (metadata: CacheMetadata): Promise<void> => {
  const cache = await caches.open(cacheMetadataName)

  await cache.put(
    cacheMetadataUrl,
    new Response(JSON.stringify(metadata), {
      headers: {
        'Content-Type': 'application/json',
      },
    }),
  )
}

const normalizeDestination = (
  destination: RequestDestination | '',
): RequestDestination | 'default' => {
  if (!destination) {
    return 'default'
  }

  return destination
}

const resolveCacheStrategy = (destination: RequestDestination | 'default'): CacheStrategy => {
  return resolvedCacheStrategies[destination] ?? resolvedCacheStrategies.default ?? 'cache-first'
}

const resolvePriority = (destination: RequestDestination | 'default', url: string): number => {
  const basePriority = resolvedCachePriorities[destination] ?? resolvedCachePriorities.default ?? 1

  if (appFileUrls.has(url)) {
    return Math.max(basePriority, APP_FILE_PRIORITY)
  }

  return basePriority
}

const pruneMetadataEntries = async (
  cache: Cache,
  metadata: CacheMetadata,
): Promise<CacheMetadata> => {
  const requests = await cache.keys()
  const existingUrls = new Set(requests.map((request) => request.url))
  const nextMetadata: CacheMetadata = {}

  for (const [url, entry] of Object.entries(metadata)) {
    if (existingUrls.has(url)) {
      nextMetadata[url] = entry
    }
  }

  if (Object.keys(nextMetadata).length !== Object.keys(metadata).length) {
    await writeCacheMetadata(nextMetadata)
  }

  return nextMetadata
}

const removeExpiredEntries = async (
  cache: Cache,
  metadata: CacheMetadata,
): Promise<CacheMetadata> => {
  if (!SW_CONFIG.cacheMaxAgeSeconds) {
    return metadata
  }

  const now = Date.now()
  const maxAgeMs = SW_CONFIG.cacheMaxAgeSeconds * MILLISECONDS_PER_SECOND
  const nextMetadata: CacheMetadata = {...metadata}

  const expiredUrls = Object.entries(metadata)
    .filter(([, entry]) => now - entry.cachedAt > maxAgeMs)
    .map(([url]) => url)

  if (expiredUrls.length > 0) {
    await Promise.all(expiredUrls.map((url) => cache.delete(url)))

    for (const url of expiredUrls) {
      delete nextMetadata[url]
    }
  }

  if (Object.keys(nextMetadata).length !== Object.keys(metadata).length) {
    await writeCacheMetadata(nextMetadata)
  }

  return nextMetadata
}

const trimCache = async (cache: Cache, metadata: CacheMetadata) => {
  if (!SW_CONFIG.cacheMaxEntries) {
    return
  }

  const entries = Object.entries(metadata)

  if (entries.length <= SW_CONFIG.cacheMaxEntries) {
    return
  }

  entries.sort((left, right) => {
    const priorityDelta = left[1].priority - right[1].priority

    if (priorityDelta !== 0) {
      return priorityDelta
    }

    return left[1].lastAccessed - right[1].lastAccessed
  })

  const removalCount = entries.length - SW_CONFIG.cacheMaxEntries
  const entriesToRemove = entries.slice(0, removalCount)
  const urlsToRemove = entriesToRemove.map(([url]) => url)

  await Promise.all(urlsToRemove.map((url) => cache.delete(url)))

  for (const url of urlsToRemove) {
    delete metadata[url]
  }

  await writeCacheMetadata(metadata)
}

const touchCacheEntry = async (
  url: string,
  destination: RequestDestination | 'default',
  isNew: boolean,
): Promise<CacheMetadata> => {
  if (url === cacheMetadataUrl) {
    return {}
  }

  const metadata = await readCacheMetadata()
  const now = Date.now()
  const priority = resolvePriority(destination, url)
  const existing = metadata[url]

  metadata[url] = {
    cachedAt: isNew ? now : (existing?.cachedAt ?? now),
    destination,
    lastAccessed: now,
    priority,
  }
  await writeCacheMetadata(metadata)

  return metadata
}

const updateCacheState = async (
  cache: Cache,
  url: string,
  destination: RequestDestination | 'default',
  isNew: boolean,
) => {
  const metadata = await touchCacheEntry(url, destination, isNew)
  const cleanedMetadata = await pruneMetadataEntries(cache, metadata)
  const freshMetadata = await removeExpiredEntries(cache, cleanedMetadata)

  await trimCache(cache, freshMetadata)
}

const getCachedResponse = async (
  cache: Cache,
  request: Request,
  destination: RequestDestination | 'default',
) => {
  const response = await cache.match(request)

  if (!response) {
    return
  }

  const metadata = await readCacheMetadata()
  const entry = metadata[request.url]

  if (SW_CONFIG.cacheMaxAgeSeconds && entry) {
    const maxAgeMs = SW_CONFIG.cacheMaxAgeSeconds * MILLISECONDS_PER_SECOND

    if (Date.now() - entry.cachedAt > maxAgeMs) {
      await cache.delete(request)
      delete metadata[request.url]
      await writeCacheMetadata(metadata)

      return
    }
  }

  await updateCacheState(cache, request.url, destination, false)

  return response
}

/**
 * Creates a network-first caching strategy
 * @param event - The fetch event
 * @param requestOptions - Network request options
 * @param cacheControl - Cache-Control header value (optional)
 */
const createNetworkFirst = async (
  event: FetchEvent,
  destination: RequestDestination | 'default',
  requestOptions: NetworkRequestOptions = {},
  cacheControl?: CacheControlValue,
) => {
  const headers = new Headers()

  if (cacheControl) {
    headers.append('cache-control', cacheControl)
    headers.append('pragma', cacheControl)
  }

  if (requestOptions.headers) {
    const optionHeaders = new Headers(requestOptions.headers)

    // eslint-disable-next-line unicorn/prefer-spread
    for (const [key, value] of Array.from(optionHeaders.entries())) {
      headers.append(key, value)
    }
  }

  try {
    const response = await fetch(event.request, {
      cache: requestOptions.cache || 'default',
      headers,
    })
    const cache = await caches.open(CACHE_NAME)

    await cache.put(event.request, response.clone())
    await updateCacheState(cache, event.request.url, destination, true)

    return response
  } catch (error) {
    emitLog('error', 'Network request failed', {
      error: error instanceof Error ? error.message : String(error),
      method: event.request.method,
      url: event.request.url,
    })

    try {
      const cache = await caches.open(CACHE_NAME)
      const resource = await getCachedResponse(cache, event.request, destination)

      if (resource) {
        emitLog('info', 'Served from cache after network error', {url: event.request.url})

        return resource
      }
    } catch (cacheError) {
      emitLog('error', 'Cache fallback also failed', {
        error: cacheError instanceof Error ? cacheError.message : String(cacheError),
      })
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

const createCacheFirst = async (event: FetchEvent, destination: RequestDestination | 'default') => {
  const cache = await caches.open(CACHE_NAME)
  const cachedResponse = await getCachedResponse(cache, event.request, destination)

  if (cachedResponse) {
    return cachedResponse
  }

  const response = await fetch(event.request)

  await cache.put(event.request, response.clone())
  await updateCacheState(cache, event.request.url, destination, true)

  return response
}

const createStaleWhileRevalidate = async (
  event: FetchEvent,
  destination: RequestDestination | 'default',
) => {
  const cache = await caches.open(CACHE_NAME)
  const cachedResponse = await getCachedResponse(cache, event.request, destination)

  const updatePromise = fetch(event.request)
    .then(async (response) => {
      await cache.put(event.request, response.clone())
      await updateCacheState(cache, event.request.url, destination, true)

      return response
    })
    .catch((error) => {
      emitLog('warn', 'Background refresh failed', {
        error: error instanceof Error ? error.message : String(error),
        url: event.request.url,
      })
    })

  if (cachedResponse) {
    return cachedResponse
  }

  const response = await updatePromise

  if (response) {
    return response
  }

  return fetch(event.request)
}

const clearCaches = async () => {
  const cacheNames = await caches.keys()

  await Promise.all(cacheNames.map((name) => caches.delete(name)))
}

// Handle service worker install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      emitLog('info', 'Installing cache', {files: APP_FILES.length, version: CACHE_VERSION})

      return cache.addAll(APP_FILES)
    }),
  )
})

// Handle service worker activation event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName.startsWith('coong-cache-')) {
              emitLog('info', 'Deleting old cache', {cacheName})

              return caches.delete(cacheName)
            }

            return Promise.resolve()
          }),
        )
      })
      .then(async () => {
        await self.clients.claim()
        await notifyClients({type: 'SW_ACTIVATED', version: CACHE_VERSION})
      }),
  )
})

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (!event.data) {
    return
  }

  if (event.data.type === 'SKIP_WAITING') {
    emitLog('info', 'Received skip waiting message')
    self.skipWaiting()

    return
  }

  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(clearCaches())
  }
})

// Handle network requests
self.addEventListener('fetch', (event: FetchEvent) => {
  const {method, url} = event.request

  if (method !== 'GET') {
    return
  }

  if (!isOriginPath(url) || isApiPath(url)) {
    return
  }

  const destination = normalizeDestination(event.request.destination)
  const strategy = resolveCacheStrategy(destination)

  if (strategy === 'network-first') {
    event.respondWith(createNetworkFirst(event, destination))

    return
  }

  if (strategy === 'stale-while-revalidate') {
    event.respondWith(createStaleWhileRevalidate(event, destination))

    return
  }

  if (strategy === 'network-only') {
    event.respondWith(fetch(event.request))

    return
  }

  event.respondWith(createCacheFirst(event, destination))
})
