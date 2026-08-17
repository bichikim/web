/**
 * e2e mode will use.env.e2e file automatically
 */
import {solidStart} from '@solidjs/start/config'
import {generateSwPlugin} from '@winter-love/sw'
import {createUnoCssInlineResolver} from '@winter-love/unocss-config'
import {targets} from '@winter-love/vite-lib-config'
import legacy from '@vitejs/plugin-legacy'
import {nitro} from 'nitro/vite'
import {fileURLToPath} from 'node:url'
import devtools from 'solid-devtools/vite'
import UnoCSS from 'unocss/vite'
import {defineConfig, loadEnv} from 'vite'

const appRoot = fileURLToPath(new URL('.', import.meta.url))
const env = loadEnv(process.env.NODE_ENV ?? 'development', appRoot, 'VITE_')
const allowedHosts =
  env.VITE_DEV_ALLOWED_HOSTS?.split(',')
    .map((host) => host.trim())
    .filter(Boolean) ?? []

const isSpa = process.env.SPA === 'true'
const legacyPlugins = legacy({targets}).map((plugin) => ({
  ...plugin,
  applyToEnvironment: (environment: {name: string}) => environment.name === 'client',
}))

export default defineConfig({
  assetsInclude: ['**/*.lottie'],
  nitro: {
    routeRules: {
      '/': {
        headers: {
          'cache-control': 'public, max-age=0, must-revalidate',
        },
      },
      '/manifest.json': {
        headers: {
          'cache-control': 'public, max-age=300, stale-while-revalidate=86400',
        },
      },
      '/sw.js': {
        headers: {
          'cache-control': 'no-cache',
        },
      },
    },
  },
  plugins: [
    createUnoCssInlineResolver(),
    UnoCSS(),
    solidStart({
      middleware: './src/middleware/index.ts',
      ssr: !isSpa,
    }),
    devtools({
      autoname: true,
      locator: {
        jsxLocation: true,
        targetIDE: 'vscode' as any,
      },
    }),
    ...legacyPlugins,
    generateSwPlugin({
      root: appRoot,
    }),
    nitro(),
  ],
  resolve: {
    alias: {
      src: fileURLToPath(new URL('src', import.meta.url)),
    },
  },
  server: {
    allowedHosts,
  },
})
