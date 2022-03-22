import * as dotenv from 'dotenv'
import * as path from 'path'
import autoImport from 'unplugin-auto-import/vite'
import {defineConfig} from 'vite'
import solid from 'vite-plugin-solid'
// import {quasar} from '@quasar/vite-plugin'

// eslint-disable-next-line import/no-named-as-default-member
dotenv.config()

// eslint-disable-next-line max-lines-per-function
export default defineConfig(() => {
  return {
    build: {
      target: 'esnext',
      polyfillDynamicImport: false,
    },
    define: {
      __DEV__: JSON.stringify('import.meta.env.DEV'),
      'process.env.NODE_ENV': JSON.stringify('import.meta.env.MODE'),
    },

    plugins: [
      solid(),
      autoImport({
        imports: [
          'solid-js',
        ],
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
      },
    },
  }
})
