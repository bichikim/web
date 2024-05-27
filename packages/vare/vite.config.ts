import vue from '@vitejs/plugin-vue'
import * as path from 'node:path'
import {fileURLToPath, URL} from 'node:url'
import {defineConfig} from 'vite'
import vueJsx from '@vitejs/plugin-vue-jsx'

export default defineConfig(() => {
  return {
    define: {
      __DEV__: JSON.stringify('import.meta.env.DEV'),
      'process.env.NODE_ENV': JSON.stringify('import.meta.env.MODE'),
    },
    optimizeDeps: {
      exclude: ['vue-demi', 'vite'],
      include: ['vue', 'vue-router'],
    },

    plugins: [
      // process.env.MODE === 'ssr' ? ssr({
      //   ssr: 'src/main-ssr.ts',
      // }) : undefined,
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
      vueJsx() as any,
    ],

    resolve: {
      alias: {
        '~/': fileURLToPath(new URL('', import.meta.url)),
        'components/': fileURLToPath(new URL('src/components', import.meta.url)),
        'dev/': fileURLToPath(new URL('dev', import.meta.url)),
        'layouts/': fileURLToPath(new URL('src/layout', import.meta.url)),
        'pages/': fileURLToPath(new URL('src/pages', import.meta.url)),
        'src/': fileURLToPath(new URL('src', import.meta.url)),
        'store/': fileURLToPath(new URL('src/store', import.meta.url)),
        vue: 'vue/dist/vue.runtime.esm-bundler.js',
      },
    },

    server: {
      // https: true,
      fs: {
        // allow: ['..', '../..'],
      },
    },
  }
})
