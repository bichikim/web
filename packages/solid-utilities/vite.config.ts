import solid from 'vite-plugin-solid'
import * as path from 'path'
import {defineConfig} from 'vite'

export default defineConfig(() => {
  return {
    define: {
      __DEV__: JSON.stringify('import.meta.env.DEV'),
      'process.env.NODE_ENV': JSON.stringify('import.meta.env.MODE'),
    },
    optimizeDeps: {
      exclude: [
      ],
      include: [
      ],
    },

    plugins: [
      solid(),
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
