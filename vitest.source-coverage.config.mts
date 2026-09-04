import {createVitestConfig, unitTestProject} from './vitest.base.config.mts'

const scope = process.env.SOURCE_COVERAGE_SCOPE

if (scope !== 'coong' && scope !== 'pomo' && scope !== 'workspace') {
  throw new Error('SOURCE_COVERAGE_SCOPE must be "coong", "pomo", or "workspace".')
}

const testIncludes = {
  coong: [
    'apps/coong/__tests__/**/*.spec.?(c|m)[jt]s?(x)',
    'apps/coong/scripts/**/*.spec.?(c|m)[jt]s?(x)',
    'apps/coong/src/**/*.spec.?(c|m)[jt]s?(x)',
  ],
  pomo: [
    'apps/pomo/__tests__/**/*.spec.?(c|m)[jt]s?(x)',
    'apps/pomo/scripts/**/*.spec.?(c|m)[jt]s?(x)',
    'apps/pomo/src/**/*.spec.?(c|m)[jt]s?(x)',
    'apps/pomo-audio-gateway/__tests__/**/*.spec.?(c|m)[jt]s?(x)',
    'apps/pomo-audio-gateway/scripts/**/*.spec.?(c|m)[jt]s?(x)',
    'apps/pomo-audio-gateway/src/**/*.spec.?(c|m)[jt]s?(x)',
  ],
  workspace: [
    'apps/*/__tests__/**/*.spec.?(c|m)[jt]s?(x)',
    'apps/*/scripts/**/*.spec.?(c|m)[jt]s?(x)',
    'apps/*/src/**/*.spec.?(c|m)[jt]s?(x)',
    'packages/*/__tests__/**/*.spec.?(c|m)[jt]s?(x)',
    'packages/*/rules/**/*.spec.?(c|m)[jt]s?(x)',
    'packages/*/src/**/*.spec.?(c|m)[jt]s?(x)',
    'packages/*/guest-js/**/*.spec.?(c|m)[jt]s?(x)',
    'scripts/**/*.spec.?(c|m)[jt]s?(x)',
    '.agents/skills/*/scripts/**/*.spec.ts',
  ],
} satisfies Readonly<Record<typeof scope, readonly string[]>>

const sourceIncludes = {
  coong: ['apps/coong/src/**/*.{js,jsx,mjs,mts,ts,tsx}'],
  pomo: [
    'apps/pomo/src/**/*.{js,jsx,mjs,mts,ts,tsx}',
    'apps/pomo-audio-gateway/src/**/*.{js,jsx,mjs,mts,ts,tsx}',
  ],
  workspace: [
    'apps/*/src/**/*.{js,jsx,mjs,mts,ts,tsx}',
    'packages/*/src/**/*.{js,jsx,mjs,mts,ts,tsx}',
    'packages/desktop-surface/guest-js/**/*.{js,jsx,mjs,mts,ts,tsx}',
    'packages/oxlint-plugins/*.{js,mjs,mts,ts}',
    'packages/oxlint-plugins/rules/**/*.{js,mjs,mts,ts}',
    'packages/vite-lib-config/*.{js,mjs,mts,ts}',
  ],
} satisfies Readonly<Record<typeof scope, readonly string[]>>

const scopeExcludes = {
  coong: [],
  pomo: [],
  workspace: ['apps/coong/**', 'apps/pomo/**', 'apps/pomo-audio-gateway/**'],
} satisfies Readonly<Record<typeof scope, readonly string[]>>

const reportsDirectory = `coverage/source/${scope}/${process.pid}`

const config = createVitestConfig([
  {
    ...unitTestProject,
    test: {
      ...unitTestProject.test,
      exclude: [...(unitTestProject.test.exclude ?? []), ...scopeExcludes[scope]],
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
        ...scopeExcludes[scope],
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
