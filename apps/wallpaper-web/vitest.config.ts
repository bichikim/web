import {fileURLToPath} from 'node:url'
import solid from '@solidjs/vite-plugin'
import {defineProject} from 'vitest/config'

export default defineProject({
  plugins: [solid()],
  root: fileURLToPath(new URL('.', import.meta.url)),
  test: {
    environment: 'jsdom',
    include: ['src/**/*.spec.{ts,tsx}'],
    name: 'unit-wallpaper-web',
  },
})
