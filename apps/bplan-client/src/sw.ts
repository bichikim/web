/* eslint-disable unicorn/prefer-global-this */
import {cleanupOutdatedCaches, precacheAndRoute} from 'workbox-precaching'
import {NavigationRoute, registerRoute} from 'workbox-routing'
import {CacheFirst, NetworkFirst, StaleWhileRevalidate} from 'workbox-strategies'
import {ExpirationPlugin} from 'workbox-expiration'

precacheAndRoute((self as any).__WB_MANIFEST)
cleanupOutdatedCaches()
self.addEventListener('install', () => {
  self.skipWaiting()
})
// html document caching
registerRoute(
  ({request}) => request.destination === 'document',
  new NetworkFirst({
    cacheName: 'html-cache',
    networkTimeoutSeconds: 3,
  }),
  'GET',
)
// Static asset caching (JS, CSS, etc)
registerRoute(
  ({request}) => ['style', 'script', 'worker'].includes(request.destination),
  new NetworkFirst({
    cacheName: 'assets-cache',
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 2592e3,
      }),
    ],
  }),
)
// Image caching
registerRoute(
  ({request}) => ['image', 'font'].includes(request.destination),
  new CacheFirst({
    cacheName: 'image-cache',
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 2592e3,
      }),
    ],
  }),
  'GET',
)
