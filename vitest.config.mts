import {monorepoAlias} from '@winter-love/vite-plugin-monorepo-alias'
import {fileURLToPath, URL} from 'node:url'
import {defineConfig} from 'vitest/config'
import solid from 'vite-plugin-solid'

export default defineConfig({
  build: {
    target: 'esnext',
  },
  plugins: [
    solid() as any,
    monorepoAlias({
      alias: {
        'packages/vite-plugin-monorepo-alias': {
          '#test': 'src/test',
        },
      },

      separator: process.platform === 'win32' ? '\\' : '/',
      root: fileURLToPath(new URL('./', import.meta.url)),
      // sourceRoot: 'src',
      workspacePaths: [/\/apps\//u, /\/packages\//u],
    }),
  ],
  resolve: {
    // for solidjs testing
    conditions: ['development', 'browser'],
  },
  test: {
    environment: 'jsdom',
    include: ['packages/*/src/**/*.spec.?(c|m)[jt]s?(x)', 'apps/*/src/**/*.spec.?(c|m)[jt]s?(x)'],
    setupFiles: ['./vitest.setup.ts'],
  },
})
