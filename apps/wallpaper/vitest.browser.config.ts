import {playwright} from '@vitest/browser-playwright'
import {fileURLToPath} from 'node:url'
import solid from 'vite-plugin-solid'
import UnoCSS from 'unocss/vite'
import {defineConfig} from 'vitest/config'
import uno from './uno.config'

export default defineConfig({
  plugins: [
    UnoCSS({
      ...uno,
      content: {
        filesystem: [
          fileURLToPath(new URL('./src/**/*.tsx', import.meta.url)),
          fileURLToPath(new URL('./visual/**/*.tsx', import.meta.url)),
        ],
      },
    }),
    solid({hot: false}),
  ],
  root: fileURLToPath(new URL('.', import.meta.url)),
  test: {
    browser: {
      enabled: true,
      headless: true,
      instances: [
        {browser: 'chromium', viewport: {height: 700, width: 900}},
        {
          browser: 'webkit',
          // WebKit's nonpersistent context rejects IndexedDB Blob/File writes.
          fileParallelism: false,
          provider: playwright({
            persistentContext: fileURLToPath(
              new URL('./node_modules/.cache/webkit', import.meta.url),
            ),
          }),
          viewport: {height: 700, width: 900},
        },
      ],
      provider: playwright(),
    },
    include: ['visual/__tests__/**/*.integration.tsx'],
    name: 'wallpaper-visual',
  },
})
