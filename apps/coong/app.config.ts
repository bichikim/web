/**
 * e2e mode will use.env.e2e file automatically
 */
import {defineConfig} from '@solidjs/start/config'
import {loadEnv} from 'vite'
import UnoCSS from 'unocss/vite'
import {fileURLToPath} from 'node:url'
import {installSwBuildHooks} from '@winter-love/sw'
import {targets} from '@winter-love/vite-lib-config'
import legacy from '@vitejs/plugin-legacy'
import devtools from 'solid-devtools/vite'

// Retrieve whether to build in SPA mode from the environment variable
const appRoot = fileURLToPath(new URL('.', import.meta.url))
const env = loadEnv(process.env.NODE_ENV ?? 'development', appRoot, 'VITE_')
const allowedHosts =
  env.VITE_DEV_ALLOWED_HOSTS?.split(',')
    .map((host) => host.trim())
    .filter(Boolean) ?? []

const isSpa = process.env.SPA === 'true'

const app = defineConfig({
  middleware: 'src/middleware/index.ts',
  server: {
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
  ssr: !isSpa,
  vite: {
    /**
     // Include .lottie files as assets during build
     */
    assetsInclude: ['**/*.lottie'],
    plugins: [
      /**
       // The solid-devtools plugin only runs in development mode
       */
      devtools({
        autoname: true,
        locator: {
          jsxLocation: true,
          targetIDE: 'vscode' as any,
        },
      }),
      /**
       // The UnoCSS plugin is configured to use the uno.config.ts file by default.
       */
      UnoCSS(),
      legacy({
        // plugin-legacy overrode 'build.target'. warning
        // I won't change build.target, so I'll ignore this warning
        targets,
      }),
    ],
    resolve: {
      alias: {
        // root source path alias
        src: fileURLToPath(new URL('src', import.meta.url)),
      },
    },
    server: {
      allowedHosts,
    },
  },
})

installSwBuildHooks(app, {
  publicPath: 'public',
  root: appRoot,
})

export default app
