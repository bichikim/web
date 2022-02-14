import {vueI18n} from '@intlify/vite-plugin-vue-i18n'
import * as path from 'path'
import {Quasar} from 'quasar'
import {defineConfig} from 'vite'
import icons from 'unplugin-icons/vite'
import markdown from 'vite-plugin-md'
import {VitePWA as vitePWA} from 'vite-plugin-pwa'
import Prism from 'markdown-it-prism'
import LinkAttributes from 'markdown-it-link-attributes'
import vitePluginImp from 'vite-plugin-imp'
import * as dotenv from 'dotenv'
import react from '@vitejs/plugin-react'
// import {quasar} from '@quasar/vite-plugin'

// eslint-disable-next-line import/no-named-as-default-member
dotenv.config()

// eslint-disable-next-line max-lines-per-function
export default defineConfig(() => {
  return {
    build: {
      chunkSizeWarningLimit: 600,
      outDir: 'dist/spa',
    },
    define: {
      __DEV__: JSON.stringify('import.meta.env.DEV'),
      __QUASAR_SSR__: JSON.stringify('import.meta.env.SSR'),
      __QUASAR_SSR_CLIENT__: JSON.stringify('import.meta.env.SSR && window !== undefined'),
      __QUASAR_SSR_PWA__: JSON.stringify(
        'navigator.standalone || window.matchMedia("(display-mode: standalone)").matches',
      ),
      __QUASAR_SSR_SERVER__: JSON.stringify('import.meta.env.SSR'),
      __QUASAR_VERSION__: JSON.stringify(Quasar.version),
      'process.env.NODE_ENV': JSON.stringify('import.meta.env.MODE'),
    },
    optimizeDeps: {
      exclude: [
        'vue-demi',
        '@quasar/app',
        'quasar',
        'vite',
      ],
      include: [
        'vue',
        'vue-router',
      ],
    },

    plugins: [
      react(),
      vitePluginImp(),
      // https://github.com/antfu/vite-plugin-md
      markdown({
        headEnabled: true,
        markdownItSetup(md) {
          // https://prismjs.com/
          md.use(Prism)
          md.use(LinkAttributes, {
            attrs: {
              rel: 'noopener',
              target: '_blank',
            },
            pattern: /^https?:\/\//u,
          })
        },
        wrapperClasses: 'q-page q-mx-auto padding',
      }),

      icons(),
      // https://github.com/antfu/vite-plugin-pwa
      vitePWA({
        includeAssets: ['favicon.svg', 'robots.txt', 'safari-pinned-tab.svg'],
        manifest: {
          icons: [
            {
              sizes: '192x192',
              src: '/pwa-192x192.png',
              type: 'image/png',
            },
            {
              sizes: '512x512',
              src: '/pwa-512x512.png',
              type: 'image/png',
            },
            {
              purpose: 'any maskable',
              sizes: '512x512',
              src: '/pwa-512x512.png',
              type: 'image/png',
            },
          ],
          name: 'Coong',
          // eslint-disable-next-line camelcase
          short_name: 'Coong',
          // eslint-disable-next-line camelcase
          theme_color: '#ffffff',
        },
        registerType: 'autoUpdate',
      }),

      // https://github.com/intlify/vite-plugin-vue-i18n
      vueI18n({
        include: [path.resolve(__dirname, 'locales/**')],
      }),
    ],

    resolve: {
      alias: {
        '~/': `${path.resolve(__dirname, '')}/`,
        'components/': `${path.resolve(__dirname, 'src/components')}/`,
        'layouts/': `${path.resolve(__dirname, 'src/layouts')}/`,
        'pages/': `${path.resolve(__dirname, 'src/pages')}/`,
        'src/': `${path.resolve(__dirname, 'src')}/`,
        'store/': `${path.resolve(__dirname, 'src/store')}/`,
        vue: 'vue/dist/vue.runtime.esm-bundler.js',
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
          target: process.env.API_URL,
        },
        '/static': {
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/static/u, ''),
          target: 'http://localhost:3000',
        },
      },
    },

    ssr: {
      noExternal: [
        /^@quasar\/extras/u,
        /^@project-serum\/sol-wallet-adapter/u,
      ],
    },
  }
})
