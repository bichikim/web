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
        '@winter-love/solid/test': resolvePath('packages/solid/src/test'),
        '@winter-love/solid/use': resolvePath('packages/solid/src/use'),
      },
      osPathDelimiter: process.platform === 'win32' ? '\\' : '/',
      root: fileURLToPath(new URL('./', import.meta.url)),
      sourceRoot: 'src',
      workspacePaths: [/^\/coong\//u, /^\/packages\//u],
    }),
  ],
})
