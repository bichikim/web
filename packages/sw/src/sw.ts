/// <reference types="@types/serviceworker" />

const CACHE_NAME = 'coong-cache'

declare const __inject_code__: string[]

const APP_FILES = __inject_code__
const {origin: originPath} = self.location
const apiPath = `${originPath}/api/`

const startsWith = (target: string, search: string) => {
  if (typeof target !== 'string' || typeof search !== 'string') {
    return false
  }

  const targetLength = target.length
  const searchLength = search.length

  if (searchLength > targetLength) {
    return false
  }

  for (let index = 0; index < searchLength; index += 1) {
    if (target[index] !== search[index]) {
      return false
    }
  }

  return true
}

const isOriginPath = (url: string) => startsWith(url, `${originPath}/`) || url === originPath

const isApiPath = (url: string) => startsWith(url, apiPath)

/**
 * Cache control header values for HTTP caching
 */
type CacheControlValue = 'no-cache' | 'no-store' | 'max-age=0' | 'must-revalidate'

/**
 * Creates a network-first caching strategy
 * @param event - The fetch event
 * @param cacheOption - Request cache option for fetch API
 * @param cacheControl - Cache-Control header value (optional)
 */
const createNetworkFirst = async (
  event: FetchEvent,
  cacheOption: RequestCache = 'default',
  cacheControl?: CacheControlValue,
) => {
  const headers = new Headers()

  if (cacheControl) {
    headers.append('cache-control', cacheControl)
    headers.append('pragma', cacheControl)
  }

  try {
    const response = await fetch(event.request, {
      headers,
      cache: cacheOption,
    })
    const cache = await caches.open(CACHE_NAME)

    await cache.put(event.request, response.clone())

    return response
  } catch {
    const resource = await caches.match(event.request)

    if (resource) {
      return resource
    }

    return new Response('Network error', {status: 500})
  }
}

// const updateCache = async (event: FetchEvent) => {
//   const response = await fetch(event.request)
//   const cache = await caches.open(CACHE_NAME)
//   await cache.put(event.request, response.clone())
// }

// const createStaleWhileRevalidate = async (event: FetchEvent) => {
//   const resource = await caches.match(event.request)

//   if (resource) {
//     // Update cache regardless of whether it exists
//     updateCache(event)

//     return resource
//   }

//   // If no cache exists, use network request and update cache
//   return createNetworkFirst(event)
// }

const createCacheFirst = async (event: FetchEvent) => {
  const resource = await caches.match(event.request)

  if (resource) {
    return resource
  }

  // Return cached resource if available
  const response = await fetch(event.request)
  const cache = await caches.open(CACHE_NAME)

  await cache.put(event.request, response.clone())

  return response
}

// Handle service worker install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_FILES)
    }),
  )
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('receive skip waiting ...')
    self.skipWaiting()
  }
})

// Handle network requests
self.addEventListener('fetch', (event: FetchEvent) => {
  const {method, url} = event.request

  // Skip caching for non-GET methods
  if (method !== 'GET') {
    return
  }

  // Skip caching for non-origin paths or API paths
  if (!isOriginPath(url) || isApiPath(url)) {
    return
  }

  const destination: RequestDestination[] = ['style', 'script', 'worker', 'manifest', 'document']

  // Use network request for document navigation, otherwise use cache request
  if (destination.includes(event.request.destination)) {
    event.respondWith(createNetworkFirst(event))

    return
  }

  event.respondWith(createCacheFirst(event))
})
