import {defineConfig} from 'vitest/config'
import browserConfig from './vitest.browser.config.mts'

export default defineConfig({
  ...browserConfig,
  test: {
    ...browserConfig.test,
    browser: {
      ...browserConfig.test?.browser,
      instances: [{browser: 'chromium'}],
    },
    include: ['src/components/album-library/__tests__/CustomAlbumSection.browser.ts'],
    name: 'pomo-album-editor-browser',
  },
})
