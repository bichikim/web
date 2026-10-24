import {defineConfig} from 'vite'
import {keySimilarity} from '@winter-love/vite-plugin-key-similarity'

export default defineConfig({
  build: {
    emptyOutDir: true,
    outDir: '../../node_modules/.cache/key-similarity-examples/sentence-duplicate',
  },
  plugins: [
    keySimilarity({
      buildMode: 'warn',
      keyDetector: ({arguments: values, imported, source}) =>
        source === './i18n' && imported === 't' && values[0]?.kind === 'string' ? 0 : undefined,
    }),
  ],
  root: import.meta.dirname,
})
