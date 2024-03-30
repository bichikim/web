import {monorepoAlias} from '@winter-love/vite-plugin-monorepo-alias'
import {fileURLToPath, URL} from 'node:url'
import {defineConfig} from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [
    vue(),
    monorepoAlias({
      osPathDelimiter: process.platform === 'win32' ? '\\' : '/',
      root: fileURLToPath(new URL('./', import.meta.url)),
      sourceRoot: 'src',
      workspacePaths: [/^\/coong\//u, /^\/packages\//u],
    }) as any,
  ],
  test: {
    include: [
      'packages/utils/src/**/*.{test,spec}.?(c|m)[jt]s?(x)',
      'packages/solid/src/**/*.{test,spec}.?(c|m)[jt]s?(x)',
      'coong/coong-client/src/**/*.{test,spec}.?(c|m)[jt]s?(x)',
    ],
    environment: 'node',
  },
})
