import {createVitestConfig, stressTestFiles} from './vitest.base.config.mts'

export default createVitestConfig([
  {
    test: {
      environment: 'node',
      include: [...stressTestFiles],
      maxWorkers: 1,
      name: 'stress',
    },
  },
])
