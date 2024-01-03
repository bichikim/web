import {defineConfig} from '@solidjs/start/config'
import {fileURLToPath, URL} from 'node:url'
import unoCss from 'unocss/vite'

export default defineConfig({
  plugins: [
    //
    unoCss(),
  ] as any,
  resolve: {
    alias: {
      src: fileURLToPath(new URL('src', import.meta.url)),
    },
  },
})
