import {defineConfig} from 'vitest/config'
import base from './vitest.browser.config'

/** GC counters require isolated browser ownership rather than parallel visual pages. */
export default defineConfig({
  ...base,
  test: {
    ...base.test,
    exclude: [],
    fileParallelism: false,
    include: ['visual/__tests__/**/*.memory.integration.tsx'],
    maxWorkers: 1,
    name: 'puppet-memory',
  },
})
