import {playwright} from '@vitest/browser-playwright'
import {fileURLToPath} from 'node:url'
import solidPlugin from 'vite-plugin-solid'
import {defineConfig} from 'vitest/config'

export default defineConfig({
  optimizeDeps: {exclude: ['es-toolkit']},
  plugins: [solidPlugin({hot: false})],
  root: fileURLToPath(new URL('.', import.meta.url)),
  test: {
    browser: {
      enabled: true,
      expect: {
        toMatchScreenshot: {
          comparatorName: 'pixelmatch',
          comparatorOptions: {
            allowedMismatchedPixelRatio: 0.0001,
            threshold: 0.1,
          },
        },
      },
      headless: true,
      instances: [{browser: 'chromium', viewport: {height: 700, width: 900}}],
      provider: playwright({contextOptions: {deviceScaleFactor: 1}}),
    },
    exclude: ['visual/__tests__/**/*.memory.integration.tsx'],
    include: ['visual/__tests__/**/*.integration.tsx'],
    // Render targets from every test page share one GPU.
    maxWorkers: 2,
    name: 'puppet-visual',
  },
})
