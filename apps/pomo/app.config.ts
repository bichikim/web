import {defineConfig} from '@solidjs/start/config'
import UnoCSS from 'unocss/vite'

const isAppsInToss = process.env.POMO_BUILD_TARGET === 'apps-in-toss'

export default defineConfig({
  server: isAppsInToss
    ? {
        prerender: {
          routes: ['/'],
        },
        preset: 'static',
      }
    : {},
  ssr: true,
  vite: {
    plugins: [UnoCSS()],
  },
})
