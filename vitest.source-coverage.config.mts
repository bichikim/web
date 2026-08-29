import {createVitestConfig, unitTestProject} from './vitest.base.config.mts'

const scope = process.env.SOURCE_COVERAGE_SCOPE

if (scope !== 'apps' && scope !== 'workspace') {
  throw new Error('SOURCE_COVERAGE_SCOPE must be either "apps" or "workspace".')
}

const testIncludes = {
  apps: [
    'apps/*/__tests__/**/*.spec.?(c|m)[jt]s?(x)',
    'apps/*/scripts/**/*.spec.?(c|m)[jt]s?(x)',
    'apps/*/src/**/*.spec.?(c|m)[jt]s?(x)',
  ],
  workspace: [
    'packages/*/__tests__/**/*.spec.?(c|m)[jt]s?(x)',
    'packages/*/rules/**/*.spec.?(c|m)[jt]s?(x)',
    'packages/*/src/**/*.spec.?(c|m)[jt]s?(x)',
    'packages/*/guest-js/**/*.spec.?(c|m)[jt]s?(x)',
    '.agents/skills/*/scripts/**/*.spec.ts',
  ],
} satisfies Readonly<Record<typeof scope, readonly string[]>>

const sourceIncludes = {
  apps: ['apps/*/src/**/*.{js,jsx,mjs,mts,ts,tsx}'],
  workspace: [
    'packages/*/src/**/*.{js,jsx,mjs,mts,ts,tsx}',
    'packages/desktop-surface/guest-js/**/*.{js,jsx,mjs,mts,ts,tsx}',
    'packages/oxlint-plugins/*.{js,mjs,mts,ts}',
    'packages/oxlint-plugins/rules/**/*.{js,mjs,mts,ts}',
    'packages/vite-lib-config/*.{js,mjs,mts,ts}',
  ],
} satisfies Readonly<Record<typeof scope, readonly string[]>>

const reportsDirectory = `coverage/source/${scope}/${process.pid}`

const config = createVitestConfig([
  {
    ...unitTestProject,
    test: {
      ...unitTestProject.test,
      include: testIncludes[scope],
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
        '**/__stories__/**',
        '**/__tests__/**',
        '**/_demo-data/**',
        '**/*.d.ts',
        '**/*.spec.{js,jsx,mjs,mts,ts,tsx}',
        '**/*.stories.{js,jsx,mjs,mts,ts,tsx}',
        '**/*.story.{js,jsx,mjs,mts,ts,tsx}',
        '**/*Demo.tsx',
        '**/*Sample.tsx',
        // Standalone kata and story-only demos are not shipped application behavior.
        'apps/coong/src/index.tsx',
        'apps/coong/src/kata/resource/index.tsx',
        'apps/coong/src/use/focus-controller/KeyCap.tsx',
        'apps/coong/src/use/focus-controller/SolidWindow.tsx',
        'packages/puppet/src/main.tsx',
        // V8 does not attribute code executed in worker threads.
        'packages/puppet/src/player/internal/prepare-puppet-document-worker.ts',
        'packages/vite-plugin-key-similarity/src/worker.ts',
      ],
      include: sourceIncludes[scope],
      reporter: ['text', 'json-summary'],
      reportsDirectory,
      thresholds: {
        branches: 1,
        functions: 1,
        lines: 1,
        perFile: true,
        statements: 1,
      },
    },
  },
}
