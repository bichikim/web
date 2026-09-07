import {defineConfig} from 'vite'
import {createAlias} from './src/alias'
import {fileURLToPath} from 'node:url'

export default defineConfig({
  build: {
    lib: {
      entry: './src/index.ts',
      formats: ['es', 'cjs'],
      name: 'vite-plugin-monorepo-alias',
    },
    outDir: '.cache/preview',
    rolldownOptions: {
      external: ['node:path'],
    },
  },
  plugins: [
    createAlias({
      root: fileURLToPath(new URL('../../', import.meta.url)),
      workspacePaths: ['packages/'],
    }),
  ],
})
