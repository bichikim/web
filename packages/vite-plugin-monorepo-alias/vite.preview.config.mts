import {defineConfig} from 'vite'
import {createAlias} from './src/resolve-id'
import {fileURLToPath} from 'node:url'

export default defineConfig({
  build: {
    lib: {
      entry: './src/index.ts',
      formats: ['es', 'cjs'],
      name: 'vite-plugin-monorepo-alias',
    },
  },
  plugins: [
    createAlias({
      root: fileURLToPath(new URL('../../', import.meta.url)),
      workspacePaths: ['packages/'],
    }),
  ],
})
