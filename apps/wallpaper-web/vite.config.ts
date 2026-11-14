import {solidStart} from '@solidjs/start/config'
import {nitro} from 'nitro/vite'
import UnoCSS from 'unocss/vite'
import {defineConfig} from 'vite'

export default defineConfig({
  nitro: {
    prerender: {crawlLinks: true, failOnError: true, routes: ['/']},
    preset: 'static',
  },
  plugins: [UnoCSS({mode: 'dist-chunk'}), solidStart({devOverlay: false, ssr: true}), nitro()],
  server: {host: '127.0.0.1', port: 3410, strictPort: true},
  worker: {format: 'es'},
})
