import {createVitestConfig, unitTestProject} from './vitest.base.config.mts'

const reportsDirectory = `coverage/source/${process.pid}`

const config = createVitestConfig([unitTestProject])

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
        // V8 does not attribute code executed in the plugin's worker thread.
        'packages/vite-plugin-key-similarity/src/worker.ts',
      ],
      include: [
        'apps/*/src/**/*.{js,jsx,mjs,mts,ts,tsx}',
        'packages/*/src/**/*.{js,jsx,mjs,mts,ts,tsx}',
        'packages/desktop-surface/guest-js/**/*.{js,jsx,mjs,mts,ts,tsx}',
        'packages/oxlint-plugins/*.{js,mjs,mts,ts}',
        'packages/oxlint-plugins/rules/**/*.{js,mjs,mts,ts}',
        'packages/vite-lib-config/*.{js,mjs,mts,ts}',
      ],
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
