import {playwright} from '@vitest/browser-playwright'
import {fileURLToPath} from 'node:url'
import solidPlugin from 'vite-plugin-solid'
import {defineConfig} from 'vitest/config'
import type {BrowserCommand} from 'vitest/node'

const setColorScheme: BrowserCommand<[colorScheme: 'light' | 'dark']> = async (
  {page},
  colorScheme,
) => {
  await page.emulateMedia({colorScheme})
}

export default defineConfig({
  plugins: [solidPlugin({hot: false})],
  resolve: {conditions: ['development', 'browser']},
  root: fileURLToPath(new URL('.', import.meta.url)),
  test: {
    browser: {
      commands: {setColorScheme},
      enabled: true,
      headless: true,
      instances: [{browser: 'chromium'}, {browser: 'firefox'}, {browser: 'webkit'}],
      provider: playwright({contextOptions: {colorScheme: 'light'}}),
    },
    include: ['src/**/__tests__/*.browser.ts'],
    name: 'pomo-browser',
  },
})
