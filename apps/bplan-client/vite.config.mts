import {defineConfig} from '@solidjs/start/config'
import {VitePWA as vitePwa} from 'vite-plugin-pwa'
import {fileURLToPath, URL} from 'node:url'
import unoCss from 'unocss/vite'

export default defineConfig({
  vite: {
    build: {
      ssrManifest: true,
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
          globPatterns: ['**/*.{js,css}'],

          // Don't fallback on document based (e.g. `/some-page`) requests
          // Even though this says `null` by default, I had to set this specifically to `null` to make it work
          navigateFallback: null,
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
