import unoCss from '@unocss/vite'
import {fileURLToPath} from 'node:url'
import {defineConfig} from 'vite'

export default defineConfig({
  plugins: [unoCss(fileURLToPath(new URL('../uno.config.ts', import.meta.url)))],
  resolve: {
    tsconfigPaths: true,
  },
})
