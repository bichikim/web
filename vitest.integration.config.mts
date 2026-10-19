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
          // visual 디렉터리의 테스트는 각 브라우저 전용 설정에서 실행한다.
          exclude: [...configDefaults.exclude, '**/visual/**'],
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
      './apps/wallpaper/vitest.browser.config.ts',
      ...visualRegressionProjects,
      './packages/puppet/vitest.storybook.config.mts',
      './packages/puppet/vitest.browser.config.ts',
    ],
  },
})
