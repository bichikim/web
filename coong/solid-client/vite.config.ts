import {defineConfig} from '@solidjs/start/config'
import {fileURLToPath, URL} from 'node:url'
import type {PluginOption} from 'vite'
import solid from 'vite-plugin-solid'
import unoCss from 'unocss/vite'

export default defineConfig({
  plugins: [
    //
    unoCss(),
    solid({
      ssr: true,
    }),
  ] as any,
  resolve: {
    alias: {
      src: fileURLToPath(new URL('src', import.meta.url)),
    },
  },
})
