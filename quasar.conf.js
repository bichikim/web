/*
 * This file runs in a Node context (it's NOT transpiled by Babel), so use only
 * the ES6 features that are supported by your Node version. https://node.green/
 */

// Configuration for your app
// https://v2.quasar.dev/quasar-cli/quasar-conf-js

/* eslint-env node */
/* eslint-disable @typescript-eslint/no-var-requires,camelcase,no-magic-numbers */
const {configure} = require('quasar/wrappers')

// eslint-disable-next-line max-lines-per-function
module.exports = configure((ctx) => {
  return {

    // animations: 'all', // --- includes all animations
    // https://v2.quasar.dev/options/animations
    animations: [],

    // https://v2.quasar.dev/quasar-cli/prefetch-feature
    // preFetch: true,
    // app boot file (/src/boot)
    // --> boot files are part of "main.js"
    // https://v2.quasar.dev/quasar-cli/boot-files
    boot: [
      'i18n',
      'emotion',
      'three',
    ],

    // Full list of options: https://v2.quasar.dev/quasar-cli/quasar-conf-js#Property%3A-build
    build: {
      // available values: 'hash', 'history'
      // transpile: false,
      // Add dependencies for transpiling with Babel (Array of string/regex)
      // (from node_modules, which are by default not transpiled).
      // Applies only if "transpile" is set to true.
      // transpileDependencies: [],
      // rtl: false, // https://v2.quasar.dev/options/rtl-support
      // preloadChunks: true,
      // showProgress: false,
      // gzip: true,
      // analyze: true,
      // Options below are automatically set depending on the env, set them if you want to override
      // extractCSS: false,
      // https://v2.quasar.dev/quasar-cli/handling-webpack
      // "chain" is a webpack-chain object https://github.com/neutrinojs/webpack-chain
      chainWebpack(/* chain */) {
        //
      },

      vueRouterMode: 'history',
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli/developing-capacitor-apps/configuring-capacitor
    capacitor: {
      appName: 'coong',
      hideSplashscreen: true,
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli/developing-cordova-apps/configuring-cordova
    cordova: {
      // noIosLegacyBuildFlag: true, // uncomment only if you know what you are doing
    },

    // https://v2.quasar.dev/quasar-cli/quasar-conf-js#Property%3A-css
    css: [
      'app.css',
    ],

    // Full list of options: https://v2.quasar.dev/quasar-cli/quasar-conf-js#Property%3A-devServer
    devServer: {
      https: false,
      open: true,
      // opens browser window automatically
      port: 8080,
    },

    // Full list of options: https://v2.quasar.dev/quasar-cli/developing-electron-apps/configuring-electron
    electron: {
      builder: {
        // https://www.electron.build/configuration/configuration

        appId: '@winter-love/client',
      },

      bundler: 'packager',

      // "chain" is a webpack-chain object https://github.com/neutrinojs/webpack-chain
      chainWebpack(/* chain */) {
        // do something with the Electron main process Webpack cfg
        // extendWebpackMain also available besides this chainWebpackMain
      },

      // "chain" is a webpack-chain object https://github.com/neutrinojs/webpack-chain
      chainWebpackPreload(/* chain */) {
        // do something with the Electron main process Webpack cfg
        // extendWebpackPreload also available besides this chainWebpackPreload
      },

      // 'packager' or 'builder'
      packager: {
        // https://github.com/electron-userland/electron-packager/blob/master/docs/api.md#options

        // OS X / Mac App Store
        // appBundleId: '',
        // appCategoryType: '',
        // osxSign: '',
        // protocol: 'myapp://path',

        // Windows only
        // win32metadata: { ... }
      },
    },

    // https://github.com/quasarframework/quasar/tree/dev/extras
    extras: [
      // 'ionicons-v4',
      // 'mdi-v5',
      // 'fontawesome-v5',
      // 'eva-icons',
      // 'themify',
      // 'line-awesome',
      // 'roboto-font-latin-ext', // this or either 'roboto-font', NEVER both!
      // optional, you are not bound to it
      'roboto-font',
      // optional, you are not bound to it
      'material-icons',
      'eva-icons',
    ],

    // https://v2.quasar.dev/quasar-cli/quasar-conf-js#Property%3A-framework
    framework: {
      config: {},

      // iconSet: 'material-icons', // Quasar icon set
      // lang: 'en-US', // Quasar language pack

      // For special cases outside of where the auto-import stategy can have an impact
      // (like functional components as one of the examples),
      // you can manually specify Quasar components/directives to be available everywhere:
      //
      // components: [],
      // directives: [],

      // Quasar plugins
      plugins: [],
    },

    // https://v2.quasar.dev/quasar-cli/developing-pwa/configuring-pwa
    pwa: {

      // only for GenerateSW
      // for the custom service worker ONLY (/src-pwa/custom-service-worker.[js|ts])
      // if using workbox in InjectManifest mode
      chainWebpackCustomSW(/* chain */) {
        //
      },

      manifest: {
        background_color: '#ffffff',
        description: 'Tag everywhere',
        display: 'standalone',
        icons: [
          {
            sizes: '128x128',
            src: 'icons/icon-128x128.png',
            type: 'image/png',
          },
          {
            sizes: '192x192',
            src: 'icons/icon-192x192.png',
            type: 'image/png',
          },
          {
            sizes: '256x256',
            src: 'icons/icon-256x256.png',
            type: 'image/png',
          },
          {
            sizes: '384x384',
            src: 'icons/icon-384x384.png',
            type: 'image/png',
          },
          {
            sizes: '512x512',
            src: 'icons/icon-512x512.png',
            type: 'image/png',
          },
        ],
        name: 'Tag Up',
        orientation: 'portrait',
        short_name: 'Tag Up',
        theme_color: '#027be3',
      },

      // 'GenerateSW' or 'InjectManifest'
      workboxOptions: {},

      workboxPluginMode: 'GenerateSW',
    },

    // https://v2.quasar.dev/quasar-cli/developing-ssr/configuring-ssr
    ssr: {

      // Tell browser when a file from the server should expire from cache (in ms)
      chainWebpackWebserver(/* chain */) {
        //
      },

      // The default port that the production server should use
      // (gets superseded if process.env.PORT is specified at runtime)
      maxAge: 1000 * 60 * 60 * 24 * 30,

      middlewares: [
        ctx.prod ? 'compression' : '',
        // keep this as last one
        'render',
      ],

      // manualStoreHydration: true,
      prodPort: 3000,

      pwa: false,
    },

    // https://v2.quasar.dev/quasar-cli/supporting-ts
    supportTS: {
      tsCheckerConfig: {
        eslint: {
          enabled: true,
          files: './src/**/*.{ts,tsx,js,jsx,vue}',
        },
      },
    },
  }
})
