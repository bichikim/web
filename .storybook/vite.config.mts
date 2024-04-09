import {monorepoAlias} from '@winter-love/vite-plugin-monorepo-alias'
import {fileURLToPath, URL} from 'node:url'
import {defineConfig} from 'vite'

export default defineConfig({
  plugins: [
    monorepoAlias({
      osPathDelimiter: process.platform === 'win32' ? '\\' : '/',
      root: fileURLToPath(new URL('../', import.meta.url)),
      sourceRoot: 'src',
      workspacePaths: [/^\/coong\//u, /^\/packages\//u],
    }) as any,
  ]
})
