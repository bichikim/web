/* eslint-disable unicorn/prefer-global-this */
import {cleanupOutdatedCaches, precacheAndRoute, PrecacheEntry} from 'workbox-precaching'
import {registerRoute} from 'workbox-routing'
import {CacheFirst, NetworkFirst, StaleWhileRevalidate} from 'workbox-strategies'
import {ExpirationPlugin} from 'workbox-expiration'

// const precaches: PrecacheEntry[] = (self as any).__WB_MANIFEST
//
// // 미리 캐싱할 파일
// precacheAndRoute(
//   precaches.map((cache) => ({
//     ...cache,
//     url: `_build/${cache.url}`,
//   })),
// )

precacheAndRoute((self as any).__WB_MANIFEST)

cleanupOutdatedCaches()

// offline 파일 캐싱
// self.addEventListener('install', (event: ExtendableEvent) => {
//   console.info('SW: install')
//   event.waitUntil(
//     caches.open('offline-cache').then((cache) => {
//       return cache.addAll(['/index.html'])
//     }),
//   )
// })
// 네트워크 요청 실패 시 fallback 처리
// registerRoute(
//   // HTML 요청인 경우
//   ({request}) => request.mode === 'navigate',
//   async ({request}): Promise<Response> => {
//     try {
//       return fetch(request)
//     } catch (error) {
//       const cache = await caches.open('offline-cache')
//       const matched = await cache.match('/index.html')
//
//       if (matched) {
//         return matched
//       }
//
//       throw error
//     }
//   },
// )

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
  ({request}) => ['image'].includes(request.destination),
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
