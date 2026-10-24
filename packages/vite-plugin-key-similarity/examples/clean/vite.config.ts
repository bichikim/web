import {defineConfig} from 'vite'
import {keySimilarity} from '@winter-love/vite-plugin-key-similarity'

export default defineConfig({
  build: {
    emptyOutDir: true,
    outDir: '../../node_modules/.cache/key-similarity-examples/clean',
  },
  plugins: [
    keySimilarity({
      buildMode: 'warn',
      keyDetector: ({arguments: values, imported, source}) =>
        source === './analytics' && imported === 'emit' && values[1]?.kind === 'string'
          ? 1
          : undefined,
    }),
  ],
  root: import.meta.dirname,
})
