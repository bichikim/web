import {createVitestConfig, unitTestProject} from './vitest.base.config.mts'

const config = createVitestConfig([
  {
    extends: true,
    test: {
      ...unitTestProject.test,
      include: ['apps/pomo/src/**/*.spec.?(c|m)[jt]s?(x)'],
      name: 'pomo-coverage',
    },
  },
])

export default {
  ...config,
  test: {
    ...config.test,
    coverage: {
      enabled: true,
      exclude: [
        'apps/pomo/src/**/__tests__/**',
        'apps/pomo/src/**/*.d.ts',
        'apps/pomo/src/**/*.spec.{ts,tsx}',
        'apps/pomo/src/**/*.story.tsx',
      ],
      include: ['apps/pomo/src/**/*.{ts,tsx}'],
      reportsDirectory: 'coverage/pomo',
      reporter: ['text', 'json-summary'],
      thresholds: {
        100: true,
        perFile: true,
      },
    },
  },
}
