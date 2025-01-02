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
        includeAssets: ['*.svg', '*.png', 'robots.txt', '*.ogg', 'index.html'],
        injectRegister: null,
        manifest: false,
        registerType: 'prompt',
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
