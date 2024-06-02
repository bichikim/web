import {defineConfig} from '@solidjs/start/config'
import {fileURLToPath, URL} from 'node:url'
import unoCss from 'unocss/vite'

export default defineConfig({
  vite: {
    plugins: [
      //
      unoCss('../../uno.config.ts'),
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
