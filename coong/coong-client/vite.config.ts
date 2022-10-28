import {defineConfig} from 'vite'
import icons from 'unplugin-icons/vite'
import {VitePWA as vitePWA} from 'vite-plugin-pwa'
import vitePluginImp from 'vite-plugin-imp'
import * as dotenv from 'dotenv'
import vue from '@vitejs/plugin-vue'
import autoImport from 'unplugin-auto-import/vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import vueJsx from '@vitejs/plugin-vue-jsx'
import iconsResolver from 'unplugin-icons/resolver'
import components from 'unplugin-vue-components/vite'
import babel from 'vite-plugin-babel'
import {extname} from 'path'

// eslint-disable-next-line import/no-named-as-default-member
dotenv.config()

// eslint-disable-next-line max-lines-per-function
export default defineConfig(({mode}) => {
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
      exclude: ['vite'],
      include: ['vue', 'vue-router'],
    },

    plugins: [
      vue(),
      components({
        dts: true,
        resolvers: [
          iconsResolver({
            prefix: 'icon',
          }),
        ],
      }),
      autoImport({
        imports: ['vue'],
        resolvers: [
          iconsResolver({
            extension: 'jsx',
            prefix: 'Icon',
          }),
        ],
      }),
      vueJsx(),
      tsconfigPaths(),
      vitePluginImp(),
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
      babel({
        babelConfig: {
          babelrc: false,
          configFile: false,
          plugins: ['@ts-gql/babel-plugin'],
          presets: [
            [
              '@babel/preset-typescript',
              {
                allExtensions: true,
                isTSX: true,
              },
            ],
          ],
        },
        filter: /\.[jt]sx?$/u,
        loader: (path) => {
          if (extname(path) === '.jsx') {
            return 'jsx'
          }
          if (extname(path) === '.tsx') {
            return 'tsx'
          }
        },
      }),
    ],

    resolve: {
      alias: {
        vue: 'vue/dist/vue.esm-bundler.js',
      },
    },

    server: {
      // https: true,
      fs: {
        // allow: ['..', '../..'],
      },

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