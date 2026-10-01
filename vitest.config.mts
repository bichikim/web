import type {ViteUserConfig} from 'vitest/config'
import baseConfig from './vitest.base.config.mts'

export default {
  ...baseConfig,
  test: {
    ...baseConfig.test,
    environment: 'jsdom',
    include: ['**/*.spec.?(c|m)[jt]s?(x)'],
    maxWorkers: 1,
    name: 'unit',
    testTimeout: 400,
  },
} satisfies ViteUserConfig
