import {defineConfig} from 'vitest/config'
import browserConfig from './vitest.browser.config'

/** Heap counters require an isolated Chromium renderer, separate from functional browser tests. */
export default defineConfig({
  ...browserConfig,
  test: {
    ...browserConfig.test,
    browser: {...browserConfig.test?.browser, instances: [{browser: 'chromium'}]},
    exclude: [],
    fileParallelism: false,
    include: ['visual/__tests__/**/*.memory.integration.tsx'],
    name: 'wallpaper-memory',
  },
})
