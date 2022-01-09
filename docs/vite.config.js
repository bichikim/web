import {defineConfig} from 'vite'
import path from 'path'

const projectRoot = path.resolve(__dirname, '..')

export default defineConfig({
  optimizeDeps: {
    exclude: [
      'vue-demi',
      'quasar',
      '@quasar/app',
    ],
    include: [
      'vue',
      '@winter-love/emotion',
      '@winter-love/use',
      '@winter-love/utils',
      '@winter-love/style-system',
      'lodash',
      'debounce',
      'fast-json-stable-stringify',
      'micro-memoize',
      'react-fast-compare',
    ],
  },
  plugins: [
  ],
  resolve: {
    alias: [
      {find: 'src', replacement: path.resolve(projectRoot, 'src')},
      {find: '~use', replacement: path.resolve(projectRoot, 'packages', 'use')},
    ],
  },
})
