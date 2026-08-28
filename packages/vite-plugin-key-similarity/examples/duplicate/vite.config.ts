import {defineConfig} from 'vite'
import {keySimilarity} from '@winter-love/vite-plugin-key-similarity'

export default defineConfig({
  build: {
    emptyOutDir: true,
    outDir: '../../node_modules/.cache/key-similarity-examples/duplicate',
  },
  plugins: [
    keySimilarity({
      buildMode: 'warn',
      keyDetector: ({arguments: values, imported, source}) =>
        source === './analytics' && imported === 'emit' && values[1]?.kind === 'string'
          ? {argumentIndex: 1, group: 'analytics'}
          : undefined,
    }),
  ],
  root: import.meta.dirname,
})
