/* eslint-disable unicorn/prefer-module,unicorn/prefer-node-protocol */
import {vueI18n} from '@intlify/vite-plugin-vue-i18n'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import path from 'path'
import {Quasar} from 'quasar'
import {defineConfig} from 'vite'
import components from 'unplugin-vue-components/vite'
import {QuasarResolver as quasarResolver} from 'unplugin-vue-components/resolvers'
import icons from 'unplugin-icons/vite'
import markdown from 'vite-plugin-md'
import iconsResolver from 'unplugin-icons/resolver'
import {VitePWA as vitePWA} from 'vite-plugin-pwa'
import ssr from 'vite-ssr-vue/plugin'
import Prism from 'markdown-it-prism'
import LinkAttributes from 'markdown-it-link-attributes'
// import {quasar} from '@quasar/vite-plugin'

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
      process.env.MODE === 'ssr' ? ssr({
        ssr: 'src/main-ssr.ts',
      }) : undefined,
      vue({
        include: [/\.vue$/u],
        template: {
          compilerOptions: {
            directiveTransforms: {
              css: () => ({
                needRuntime: true,
                props: [],
              }),
            },
          },
        },
      }),
      // quasar() as any,
      vueJsx(),

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

      // https://github.com/antfu/vite-plugin-components
      components({
        resolvers: [
          quasarResolver(),
          iconsResolver(),
        ],
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
    },

    ssr: {
      noExternal: [
        /^@quasar\/extras/u,
        /^@project-serum\/sol-wallet-adapter/u,
        // /^@babylonjs\/core/u,
        // /^@babylonjs\/loaders/u,
        // /^vite-ssr-vue/u,
      ],
    },
  }
})
