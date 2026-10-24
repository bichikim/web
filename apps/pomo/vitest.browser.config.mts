import {playwright} from '@vitest/browser-playwright'
import {fileURLToPath} from 'node:url'
import {createGenerator} from 'unocss'
import solidPlugin from 'vite-plugin-solid'
import {defineConfig} from 'vitest/config'
import type {BrowserCommand} from 'vitest/node'
import unoConfig from './uno.config'

const setColorScheme: BrowserCommand<[colorScheme: 'light' | 'dark']> = async (
  {page},
  colorScheme,
) => {
  await page.emulateMedia({colorScheme})
}

const setReducedMotion: BrowserCommand<[reducedMotion: 'reduce' | 'no-preference']> = async (
  {page},
  reducedMotion,
) => {
  await page.emulateMedia({reducedMotion})
}

const getUtilityStyles: BrowserCommand<[content: string]> = async (_context, content) => {
  const generator = await createGenerator(unoConfig)
  const {css} = await generator.generate(content)
  return css
}

const nativeHorizontalWheel: BrowserCommand<[delta: number]> = async ({page}, delta) => {
  await page.mouse.wheel(delta, 0)
}

export default defineConfig({
  optimizeDeps: {include: ['media-chrome']},
  plugins: [solidPlugin({hot: false})],
  resolve: {conditions: ['development', 'browser'], tsconfigPaths: true},
  root: fileURLToPath(new URL('.', import.meta.url)),
  test: {
    browser: {
      commands: {getUtilityStyles, nativeHorizontalWheel, setColorScheme, setReducedMotion},
      enabled: true,
      headless: true,
      instances: [{browser: 'chromium'}, {browser: 'firefox'}, {browser: 'webkit'}],
      provider: playwright({contextOptions: {colorScheme: 'light'}}),
    },
    include: ['src/**/__tests__/*.browser.ts'],
    name: 'pomo-browser',
  },
})
