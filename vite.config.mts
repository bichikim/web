import {fileURLToPath, URL} from 'node:url'
import {monorepoAlias} from '@winter-love/vite-plugin-monorepo-alias'
import {defineConfig} from 'vite'

export default defineConfig({
  plugins: [
    // Vite Plugins
    monorepoAlias({
      root: fileURLToPath(new URL('./', import.meta.url)),
      workspacePaths: [/\/coong\//u, /\/packages\//u],
    }) as any,
  ],
})
