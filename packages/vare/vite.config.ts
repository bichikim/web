import vue from '@vitejs/plugin-vue'
import * as path from 'path'
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
        '~/': `${path.resolve(__dirname, '')}/`,
        'components/': `${path.resolve(__dirname, 'src/components')}/`,
        'dev/': `${path.resolve(__dirname, 'dev')}/`,
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
  }
})
