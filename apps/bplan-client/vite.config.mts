import {defineConfig} from '@solidjs/start/config'
import {VitePWA as vitePwa} from 'vite-plugin-pwa'
import {fileURLToPath, URL} from 'node:url'
import unoCss from 'unocss/vite'

export default defineConfig({
  server: {
    prerender: {
      routes: ['/'],
    },
  },
  vite: {
    build: {
      minify: false,
    },
    plugins: [
      unoCss('../../uno.config.ts'),
      vitePwa({
        injectRegister: null,
        manifest: false,
        registerType: 'prompt',
        strategies: 'generateSW',
        workbox: {
          // Only precache these files - html should be excluded
          globPatterns: ['**/*.{js,css,ogg}'],
          // Don't fallback on document based (e.g. `/some-page`) requests
          // Even though this says `null` by default, I had to set this specifically to `null` to make it work
          navigateFallback: null,
          runtimeCaching: [
            {
              handler: 'NetworkFirst',
              options: {
                cacheName: 'html-cache',
                networkTimeoutSeconds: 3,
                precacheFallback: {
                  fallbackURL: '/index.html',
                },
              },
              urlPattern: ({request}) => request.destination === 'document',
            },
            {
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'assets-cache',
              },
              urlPattern: ({request}) =>
                ['style', 'script', 'worker'].includes(request.destination),
            },
            {
              handler: 'CacheFirst',
              options: {
                cacheName: 'image-cache',
                expiration: {
                  maxAgeSeconds: 2_592_000,
                },
              },
              urlPattern: ({request}) => ['image'].includes(request.destination),
            },
          ],
        },
      }),
    ] as any,
    resolve: {
      alias: {
        // fix #start/app is app.tsx only @solid/state error
        '#start/app': fileURLToPath(new URL('src/App.tsx', import.meta.url)),
        src: fileURLToPath(new URL('src', import.meta.url)),
      },
    },
  },
})
