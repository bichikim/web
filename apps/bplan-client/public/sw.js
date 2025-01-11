/* eslint-disable max-nested-callbacks */
/* eslint-disable unicorn/prefer-global-this */
const CACHE_NAME = 'coong-cache'

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})
self.addEventListener('fetch', (event) => {
  if (event.request.method.lowercase() !== 'get') {
    return
  }

  if (
    !event.request.url.startsWith('http://') &&
    !event.request.url.startsWith('https://')
  ) {
    return
  }

  event.respondWith(
    caches.match(event.request).then((resource) => {
      if (resource) {
        return resource
      }

      // Return cached resource if available
      return fetch(event.request).then((response) => {
        return caches.open(CACHE_NAME).then((cache) => {
          // Store response in cache
          cache.put(event.request, response.clone())

          // Return response
          return response
        })
      })
    }),
  )
})
