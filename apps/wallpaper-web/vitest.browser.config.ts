import {playwright} from '@vitest/browser-playwright'
import {fileURLToPath} from 'node:url'
import solid from 'vite-plugin-solid'
import UnoCSS from 'unocss/vite'
import {defineConfig} from 'vitest/config'
import uno from './uno.config'

export default defineConfig({
  plugins: [UnoCSS(uno), solid({hot: false})],
  root: fileURLToPath(new URL('.', import.meta.url)),
  test: {
    browser: {
      enabled: true,
      headless: true,
      instances: [
        {browser: 'chromium', viewport: {height: 900, width: 1280}},
        {browser: 'webkit', viewport: {height: 900, width: 1280}},
      ],
      provider: playwright(),
    },
    include: ['src/**/*.integration.tsx'],
    name: 'wallpaper-web-browser',
  },
})
