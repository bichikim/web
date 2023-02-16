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
import markdown from 'vite-plugin-vue-markdown'
// import unocss from '@unocss/vite'

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
      vue({
        include: [/\.vue$/u, /\.md$/u],
      }),
      markdown(),
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
      }),
    ],
    resolve: {
      alias: {
        src: fileURLToPath(new URL('src', import.meta.url)),
        vue: 'vue/dist/vue.esm-bundler.js',
      },
    },
    server: {
      // https: true,
      fs: {
        // allow: ['..', '../..'],
      },
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
