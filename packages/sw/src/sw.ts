/* eslint-disable max-nested-callbacks */
/* eslint-disable unicorn/prefer-global-this */
/// <reference types="@types/serviceworker" />
const CACHE_NAME = 'coong-cache'

// eslint-disable-next-line camelcase
declare const __inject_code__: string[]

// eslint-disable-next-line camelcase
const APP_FILES = __inject_code__

self.addEventListener('install', (event) => {
  event.waitUntil(() => {
    caches.open(CACHE_NAME).then((cache) => {
      cache.addAll(APP_FILES)
    })
    self.skipWaiting()
  })
})
self.addEventListener('fetch', (event) => {
  const {origin} = self.location
  const apiPath = `${origin}/api/`

  if (event.request.method !== 'GET') {
    return
  }

  if (
    !event.request.url.startsWith('http://') &&
    !event.request.url.startsWith('https://') &&
    !event.request.url.startsWith(apiPath)
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
