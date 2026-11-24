import {solidStart} from '@solidjs/start/config'
import {THEME_PORT} from '@winter-love/wallpaper/theme-location'
import {nitro} from 'nitro/vite'
import UnoCSS from 'unocss/vite'
import {defineConfig} from 'vite'
import {downloadPath, themes} from './src/catalog'

export default defineConfig({
  plugins: [
    UnoCSS({mode: 'dist-chunk'}),
    solidStart({devOverlay: false, ssr: true}),
    nitro({
      prerender: {
        failOnError: true,
        routes: ['/', ...themes.map((theme) => downloadPath(theme.slug))],
      },
      preset: 'static',
    }),
  ],
  server: {host: '127.0.0.1', port: THEME_PORT, strictPort: true},
  ssr: {noExternal: ['@winter-love/wallpaper']},
})
