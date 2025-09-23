import {monorepoAlias} from '@winter-love/vite-plugin-monorepo-alias'
import {fileURLToPath, URL} from 'node:url'
import {defineConfig} from 'vitest/config'
import solid from 'vite-plugin-solid'

const resolvePath = (url: string) => fileURLToPath(new URL(url, import.meta.url))

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

      // osPathDelimiter: process.platform === 'win32' ? '\\' : '/',
      root: fileURLToPath(new URL('./', import.meta.url)),
      // sourceRoot: 'src',
      workspacePaths: [/\/coong\//u, /\/packages\//u],
    }),
  ],
  // resolve: {
  //   alias: {
  //     '@winter-love/solid/test': resolvePath('packages/solid/src/test'),
  //     '@winter-love/solid/use': resolvePath('packages/solid/src/use'),
  //   },
  // },
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
