import {createVitestConfig, unitTestProject} from './vitest.base.config.mts'

const visualRegressionProjects =
  process.platform === 'darwin' ? ['./apps/pomo/vitest.visual-regression.config.mts'] : []

export default createVitestConfig([
  unitTestProject,
  './vitest.storybook.config.mts',
  './apps/coong/vitest.storybook.config.mts',
  './apps/pomo/vitest.storybook.config.mts',
  ...visualRegressionProjects,
  './packages/puppet/vitest.storybook.config.mts',
])
