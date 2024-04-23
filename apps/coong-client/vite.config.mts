/* eslint-disable no-magic-numbers */
import {defineConfig} from 'vite'
import icons from 'unplugin-icons/vite'
import {VitePWA as vitePWA} from 'vite-plugin-pwa'
import vue from '@vitejs/plugin-vue'
import tsconfigPaths from 'vite-tsconfig-paths'
import vueJsx from '@vitejs/plugin-vue-jsx'
import iconsResolver from 'unplugin-icons/resolver'
import components from 'unplugin-vue-components/vite'
import checker from 'vite-plugin-checker'
import {fileURLToPath, URL} from 'node:url'
import topLevelAwait from 'vite-plugin-top-level-await'
import basicSsl from '@vitejs/plugin-basic-ssl'
import unoCss from 'unocss/vite'
import markdown from 'unplugin-vue-markdown/vite'

// eslint-disable-next-line max-lines-per-function
export default defineConfig(({mode}) => {
  // load env
  // https://vitejs.dev/config/#environment-variables
  // const env = loadEnv(mode, process.cwd(), '')
  return {
    build: {
      chunkSizeWarningLimit: 600,
      outDir: 'dist/spa',
    },
    define: {
      __DEV__: JSON.stringify('import.meta.env.DEV'),
      'process.env.NODE_ENV': JSON.stringify(mode),
    },
    esbuild: {
      legalComments: 'none',
    },
    optimizeDeps: {
      exclude: ['vite', 'vue-demi'],
      include: ['vue', 'vue-router'],
    },
    plugins: [
      unoCss({}),
      vue({
        include: [/\.vue$/u, /\.md$/u],
      }),
      checker({
        typescript: {
          tsconfigPath: 'tsconfig.check.json',
        },
        vueTsc: {
          tsconfigPath: 'tsconfig.check.json',
        },
      }),
      components({
        dts: true,
        resolvers: [
          iconsResolver({
            prefix: 'icon',
          }),
        ],
      }) as any,
      vueJsx(),
      tsconfigPaths(),
      // vitePluginImp(),
      topLevelAwait(),
      icons({
        autoInstall: true,
      }),
      markdown({
        headEnabled: true,
      }),
      basicSsl(),
      // https://github.com/antfu/vite-plugin-pwa
      vitePWA({
        includeAssets: ['favicon.svg', 'robots.txt', 'safari-pinned-tab.svg'],
        manifest: {
          icons: [
            {
              purpose: 'any maskable',
              sizes: '192x192',
              src: 'images/pwa/manifest-icon-192.maskable.png',
              type: 'image/png',
            },
            {
              purpose: 'any maskable',
              sizes: '512x512',
              src: 'images/pwa/manifest-icon-512.maskable.png',
              type: 'image/png',
            },
          ],

          // ...manifest,
          name: 'coong',

          // eslint-disable-next-line camelcase
          short_name: 'coong',
          // eslint-disable-next-line camelcase
          theme_color: '#ffffff',
        },
        registerType: 'autoUpdate',
        workbox: {
          runtimeCaching: [
            {
              handler: 'CacheFirst',
              options: {
                cacheName: 'cdn-jsdelivr',
                cacheableResponse: {
                  statuses: [0, 200],
                },
                expiration: {
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                  maxEntries: 10,
                },
              },
              urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/iu,
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        src: fileURLToPath(new URL('src', import.meta.url)),
        vue: 'vue/dist/vue.esm-bundler.js',
      },
    },
    server: {
      fs: {
        // allow: ['..', '../..'],
      },
      https: true,
      // api proxy
      proxy: {
        '/server': {
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/server/u, ''),
          target: process.env.VITE_API_URL,
        },
        '/static': {
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/static/u, ''),
          target: 'http://localhost:3000',
        },
      },
    },
  }
})
