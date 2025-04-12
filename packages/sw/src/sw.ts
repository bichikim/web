/// <reference types="@types/serviceworker" />

const CACHE_NAME = 'coong-cache'

// eslint-disable-next-line camelcase
declare const __inject_code__: string[]

// eslint-disable-next-line camelcase
const APP_FILES = __inject_code__
const {origin: originPath} = self.location
const apiPath = `${originPath}/api/`

const isOriginPath = (url: string) =>
  url.startsWith(`${originPath}/`) || url === originPath

const isApiPath = (url: string) => url.startsWith(apiPath)

const createNetworkFirst = async (event: FetchEvent, cache: RequestCache = 'default') => {
  const headers = new Headers()

  headers.append('cache-control', cache)
  headers.append('pragma', cache)

  try {
    const response = await fetch(event.request, {headers})
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
  event.waitUntil(() => {
    caches.open(CACHE_NAME).then((cache) => {
      cache.addAll(APP_FILES)
    })
  })
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
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

  const destination: RequestDestination[] = [
    'style',
    'script',
    'worker',
    'manifest',
    'document',
  ]

  // Use network request for document navigation, otherwise use cache request
  if (destination.includes(event.request.destination)) {
    event.respondWith(createNetworkFirst(event))

    return
  }

  event.respondWith(createCacheFirst(event))
})
