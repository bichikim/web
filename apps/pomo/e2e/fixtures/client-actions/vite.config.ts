import {fileURLToPath} from 'node:url'
import {solidStart} from '@solidjs/start/config'
import {nitro} from 'nitro/vite'
import {defineConfig} from 'vite'

const fixtureDirectory = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  cacheDir: '.vite',
  define: {
    'import.meta.env.VITE_POMO_IS_APPS_IN_TOSS': JSON.stringify('false'),
    'import.meta.env.VITE_POMO_IS_DESKTOP': JSON.stringify('false'),
    'import.meta.env.VITE_POMO_PUBLIC_ORIGIN': JSON.stringify('http://127.0.0.1:44175'),
  },
  plugins: [solidStart({devOverlay: false, solid: {hot: false}}), nitro()],
  resolve: {
    alias: {
      '@apps-in-toss/web-framework': fileURLToPath(
        new URL('./src/apps-in-toss-web-framework.ts', import.meta.url),
      ),
      '@paraglide/message': fileURLToPath(
        new URL('../../../.i18n/paraglide/messages.js', import.meta.url),
      ),
      '@paraglide/runtime': fileURLToPath(
        new URL('../../../.i18n/paraglide/runtime.js', import.meta.url),
      ),
    },
  },
  root: fixtureDirectory,
})
