import {createVitestConfig} from './vitest.base.config.mts'

export default createVitestConfig([
  {
    test: {
      environment: 'node',
      include: ['packages/puppet/src/editor/__tests__/deletion-stress.spec.ts'],
      maxWorkers: 1,
      name: 'stress',
    },
  },
])
