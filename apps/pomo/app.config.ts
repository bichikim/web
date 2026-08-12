import {defineConfig} from '@solidjs/start/config'
import UnoCSS from 'unocss/vite'

const isAppsInToss = process.env.POMO_BUILD_TARGET === 'apps-in-toss'

export default defineConfig({
  server: isAppsInToss
    ? {
        prerender: {
          routes: [
            '/',
            '/character',
            '/chat',
            '/dialogue',
            '/focus-room',
            '/speech-to-text',
            '/terms',
            '/voice',
          ],
        },
        preset: 'static',
      }
    : {},
  ssr: true,
  vite: {
    optimizeDeps: {
      include: ['onnxruntime-web/all', 'zod'],
    },
    plugins: [UnoCSS()],
  },
})
