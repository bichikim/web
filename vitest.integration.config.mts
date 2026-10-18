import {configDefaults, mergeConfig} from 'vitest/config'
import baseConfig from './vitest.base.config.mts'

const visualRegressionProjects =
  process.platform === 'darwin' ? ['./apps/pomo/vitest.visual-regression.config.mts'] : []

export default mergeConfig(baseConfig, {
  test: {
    projects: [
      {
        extends: true,
        test: {
          environment: 'node',
          // Visual integrations use the browser Vitest project below.
          exclude: [...configDefaults.exclude, '**/visual/__tests__/**'],
          fileParallelism: false,
          include: ['**/*.integration.?(c|m)[jt]s?(x)'],
          maxWorkers: 1,
          name: 'integration',
          testTimeout: 20_000,
        },
      },
      './vitest.storybook.config.mts',
      './apps/coong/vitest.storybook.config.mts',
      './apps/pomo/vitest.storybook.config.mts',
      './apps/pomo/vitest.browser.config.mts',
      ...visualRegressionProjects,
      './packages/puppet/vitest.storybook.config.mts',
      './packages/puppet/vitest.browser.config.ts',
    ],
  },
})
