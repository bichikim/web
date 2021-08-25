import path from 'path'
import {defineConfig} from 'vite'
import Vue from '@vitejs/plugin-vue'
// import Pages from 'vite-plugin-pages'
// import Layouts from 'vite-plugin-vue-layouts'
import ViteIcons, {ViteIconsResolver} from 'vite-plugin-icons'
import ViteComponents from 'vite-plugin-components'
// import Markdown from 'vite-plugin-md'
import {VitePWA} from 'vite-plugin-pwa'
import VueI18n from '@intlify/vite-plugin-vue-i18n'
import VueJsx from '@vitejs/plugin-vue-jsx'
// import Prism from 'markdown-it-prism'
// import LinkAttributes from 'markdown-it-link-attributes'

export default defineConfig({
  optimizeDeps: {
    exclude: [
      'vue-demi',

      '@quasar/app',
      'quasar',
    ],
    include: [
      'vue',
      '@emotion/css/create-instance',
      'vue-router',
    ],
  },
  plugins: [
    Vue({
      include: [/\.vue$/u],
    }),
    VueJsx(),
    // https://github.com/hannoeru/vite-plugin-pages
    // Pages({
    //   extensions: ['vue', 'md'],
    // }),

    // https://github.com/JohnCampionJr/vite-plugin-vue-layouts
    // Layouts(),

    // https://github.com/antfu/vite-plugin-md
    // Markdown({
    //   headEnabled: true,
    //   markdownItSetup(md) {
    //     // https://prismjs.com/
    //     md.use(Prism)
    //     md.use(LinkAttributes, {
    //       attrs: {
    //         rel: 'noopener',
    //         target: '_blank',
    //       },
    //       pattern: /^https?:\/\//,
    //     })
    //   },
    //   wrapperClasses: 'q-page q-mx-auto padding',
    // }),

    // https://github.com/antfu/vite-plugin-components
    ViteComponents({

      // auto import icons
      customComponentResolvers: [
        // https://github.com/antfu/vite-plugin-icons
        ViteIconsResolver({
          componentPrefix: '',
          enabledCollections: ['carbon'],
        }),
      ],

      // allow auto import and register components used in markdown
      // customLoaderMatcher: (id) => id.endsWith('.md'),

      // allow auto load markdown components under `./src/components/`
      extensions: ['vue'],

      globalComponentsDeclaration: true,
    }),

    // https://github.com/antfu/vite-plugin-icons
    ViteIcons(),
    // https://github.com/antfu/vite-plugin-pwa
    VitePWA({
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
        name: 'Vitesse',
        // eslint-disable-next-line camelcase
        short_name: 'Vitesse',
        // eslint-disable-next-line camelcase
        theme_color: '#ffffff',
      },
      registerType: 'autoUpdate',
    }),

    // https://github.com/intlify/vite-plugin-vue-i18n
    VueI18n({
      include: [path.resolve(__dirname, 'locales/**')],
    }),
  ],

  resolve: {
    alias: {
      'components/': `${path.resolve(__dirname, 'src/components')}/`,
      'layouts/': `${path.resolve(__dirname, 'src/layouts')}/`,
      'pages/': `${path.resolve(__dirname, 'src/pages')}/`,
      'src/': `${path.resolve(__dirname, 'src')}/`,
      'store/': `${path.resolve(__dirname, 'src/store')}/`,
      '~/': `${path.resolve(__dirname, '')}/`,
    },
  },

  server: {
    fs: {
      // allow: ['..', '../..'],
    },
  },
})
