/* eslint-disable unicorn/prefer-global-this */
import {cleanupOutdatedCaches, precacheAndRoute} from 'workbox-precaching'
import {registerRoute} from 'workbox-routing'
import {CacheFirst, NetworkFirst, StaleWhileRevalidate} from 'workbox-strategies'
import {ExpirationPlugin} from 'workbox-expiration'

precacheAndRoute((self as any).__WB_MANIFEST)

cleanupOutdatedCaches()

registerRoute(
  ({request}) => request.destination === 'document',
  new NetworkFirst({
    cacheName: 'html-cache',
    networkTimeoutSeconds: 3,
  }),
  'GET',
)

// 정적 자산 캐싱 (JS, CSS 등)
registerRoute(
  ({request}) => ['style', 'script', 'worker'].includes(request.destination),
  new StaleWhileRevalidate({
    cacheName: 'assets-cache',
  }),
)

// 이미지 캐싱
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
