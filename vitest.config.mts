import {fileURLToPath} from 'node:url'
import {configDefaults, type ViteUserConfig} from 'vitest/config'
import {createPoffoTestProject, poffoTestSources} from './apps/poffo/vitest.config'
import baseConfig from './vitest.base.config.mts'

export default {
  test: {
    // Shared inputs and files read outside the module graph can affect every unit test.
    forceRerunTriggers: [
      ...configDefaults.forceRerunTriggers,
      '**/vitest*.config.*',
      '**/vitest.setup.*',
      '**/tsconfig*.json',
      '**/pnpm-lock.yaml',
      '**/pnpm-workspace.yaml',
      '**/patches/**',
      '**/packages/*/src/**',
      '**/.i18n/**',
      '**/public/**',
      '**/asset-library/**',
      '**/fixtures/**',
      '**/__fixtures__/**',
      '**/*.snap',
      '**/__snapshots__/**',
      '**/.github/workflows/checks.yml',
    ].map((pattern) => fileURLToPath(new URL(pattern, import.meta.url))),
    maxWorkers: 3,
    projects: [
      {
        ...baseConfig,
        test: {
          ...baseConfig.test,
          environment: 'jsdom',
          exclude: [
            ...configDefaults.exclude,
            '**/.cache/**',
            ...poffoTestSources.map((directory) => `${directory}/**`),
          ],
          include: ['**/*.spec.?(c|m)[jt]s?(x)'],
          name: 'unit',
        },
      },
      createPoffoTestProject('unit'),
    ],
  },
} satisfies ViteUserConfig
