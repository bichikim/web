import unoCss from '@unocss/vite'
import {fileURLToPath} from 'node:url'
import {defineConfig} from 'vite'

export default defineConfig({
  plugins: [
    unoCss({
      configFile: fileURLToPath(new URL('../uno.config.ts', import.meta.url)),
      content: {
        filesystem: [fileURLToPath(new URL('../src/**/*.{ts,tsx}', import.meta.url))],
      },
    }),
  ],
  resolve: {
    tsconfigPaths: true,
  },
})
