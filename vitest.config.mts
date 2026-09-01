import {createVitestConfig, unitTestProject} from './vitest.base.config.mts'

export default createVitestConfig([
  unitTestProject,
  './vitest.storybook.config.mts',
  './apps/coong/vitest.storybook.config.mts',
  './apps/pomo/vitest.storybook.config.mts',
  './packages/puppet/vitest.storybook.config.mts',
])
