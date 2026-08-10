import {defineConfig} from '@solidjs/start/config'
import {needlePlugins} from '@needle-tools/engine/vite'
import UnoCSS from 'unocss/vite'

const isAppsInToss = process.env.POMO_BUILD_TARGET === 'apps-in-toss'
const needleEnginePlugins = await needlePlugins(undefined, undefined, {
  ai: {install: false},
})

export default defineConfig({
  server: isAppsInToss
    ? {
        prerender: {
          routes: ['/', '/character', '/dialogue', '/voice'],
        },
        preset: 'static',
      }
    : {},
  ssr: true,
  vite: {
    optimizeDeps: {
      include: ['onnxruntime-web/all', 'zod'],
    },
    plugins: [UnoCSS(), ...needleEnginePlugins],
  },
})
