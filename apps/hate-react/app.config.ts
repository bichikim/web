import {defineConfig} from '@solidjs/start/config'
import UnoCSS from 'unocss/vite'
import {fileURLToPath} from 'node:url'

export default defineConfig({
  ssr: true,
  vite: {
    // Vinxi uses Vite 6, UnoCSS uses Vite 7 — Plugin types are incompatible
    plugins: [UnoCSS() as any],
    resolve: {
      alias: {
        src: fileURLToPath(new URL('src', import.meta.url)),
      },
    },
  },
})
