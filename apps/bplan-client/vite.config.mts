import {defineConfig} from '@solidjs/start/config'
import {VitePWA as vitePwa} from 'vite-plugin-pwa'
import {fileURLToPath, URL} from 'node:url'
import unoCss from 'unocss/vite'
export default defineConfig({
  vite: {
    plugins: [
      unoCss('../../uno.config.ts'),
      vitePwa({
        injectRegister: null,
        manifest: false,
        registerType: 'autoUpdate',
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
