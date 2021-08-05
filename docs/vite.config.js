import {defineConfig} from 'vite'
import path from 'path'

const projectRoot = path.resolve(__dirname, '../')

export default defineConfig({
  resolve: {
    alias: [
      {find: '~use', replacement: path.resolve(projectRoot, 'packages', 'use', 'src')},
    ],
  },
  plugins: [
  ],
})
