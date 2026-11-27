import {fileURLToPath} from 'node:url'
import solid from '@solidjs/vite-plugin'
import {configDefaults, defineProject} from 'vitest/config'

import baseConfig from '../../vitest.base.config.mts'

const INTEGRATION_TIMEOUT_MS = 20_000
const workspace = fileURLToPath(new URL('../..', import.meta.url))

export const poffoTestSources = ['apps/poffo', 'packages/puppet']

export const createPoffoTestProject = (kind: 'unit' | 'integration') =>
  defineProject({
    plugins: [solid()],
    resolve: {
      ...baseConfig.resolve,
      dedupe: ['solid-js', '@solidjs/web', '@solidjs/testing-library'],
    },
    root: fileURLToPath(new URL('.', import.meta.url)),
    test: {
      ...baseConfig.test,
      dir: workspace,
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, '**/visual/**'],
      include: poffoTestSources.map((directory) =>
        kind === 'unit'
          ? `${directory}/**/*.spec.?(c|m)[jt]s?(x)`
          : `${directory}/**/*.integration.?(c|m)[jt]s?(x)`,
      ),
      name: `${kind}-poffo`,
      setupFiles: [
        fileURLToPath(new URL('../../vitest.setup.ts', import.meta.url)),
        fileURLToPath(new URL('./vitest.setup.ts', import.meta.url)),
      ],
      testTimeout: kind === 'integration' ? INTEGRATION_TIMEOUT_MS : undefined,
    },
  })
