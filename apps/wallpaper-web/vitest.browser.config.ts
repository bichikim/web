import {playwright} from '@vitest/browser-playwright'
import {fileURLToPath} from 'node:url'
import solid from 'vite-plugin-solid'
import UnoCSS from 'unocss/vite'
import {normalizePath} from 'vite'
import {defineConfig} from 'vitest/config'
import uno from './uno.config'

const preview = normalizePath(
  fileURLToPath(new URL('./src/features/character-preview/', import.meta.url)),
)

export default defineConfig({
  plugins: [
    {
      enforce: 'pre',
      name: 'character-preview-fixtures',
      resolveId(source, importer) {
        const owner = normalizePath(importer?.split('?')[0] ?? '')
        if (
          source === '@winter-love/puppet/player' &&
          (owner === `${preview}index.ts` || owner === `${preview}__tests__/index.integration.tsx`)
        ) {
          return `${preview}__tests__/fixtures/player.ts`
        }
        if (source === './look' && owner === `${preview}index.ts`) {
          return `${preview}__tests__/fixtures/look.ts`
        }
        return undefined
      },
    },
    UnoCSS(uno),
    solid({hot: false}),
  ],
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
