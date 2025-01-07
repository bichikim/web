import {defineConfig} from '@solidjs/start/config'
import {VitePWA as vitePwa} from 'vite-plugin-pwa'
import {fileURLToPath, URL} from 'node:url'
import unoCss from 'unocss/vite'

export default defineConfig({
  server: {
    prerender: {
      routes: ['/'],
    },
  },
  vite: {
    // build: {
    //   minify: false,
    // },
    plugins: [
      unoCss('../../uno.config.ts'),
      vitePwa({
        base: '/',
        buildBase: '/',
        filename: 'sw.ts',
        includeAssets: ['favicon.svg', 'robots.txt', '*.svg', '*.png', '*.html'],
        injectManifest: {
          globDirectory: '.vinxi/build/client',
          globPatterns: ['**/*.{js,css,html,svg,png}'],
        },
        injectRegister: null,
        manifest: false,
        outDir: './public',
        registerType: 'autoUpdate',
        scope: '/',
        srcDir: 'src',
        strategies: 'injectManifest',
      }),
    ] as any,
    resolve: {
      alias: {
        // fix #start/app is app.tsx only @solid/state error
        '#start/app': fileURLToPath(new URL('src/App.tsx', import.meta.url)),
        src: fileURLToPath(new URL('src', import.meta.url)),
      },
    },
  },
})
