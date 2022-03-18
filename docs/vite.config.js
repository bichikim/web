import {defineConfig} from 'vite'
import path from 'path'

const projectRoot = path.resolve(__dirname, '..')

export default defineConfig({
  optimizeDeps: {
    exclude: [
      'vue-demi',
    ],
    include: [
      'vue',
      '@winter-love/use',
      '@winter-love/utils',
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
