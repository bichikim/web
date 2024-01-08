# Vite Plugin Monorepo alias

This is a Vite plugin for resolving alias paths available in a monorepo.

## Setting

```ts
import {defineConfig} from 'vite'
import {monorepoAlias} from '@winter-love/vite-plugin-monorepo-alias'

export default defineConfig({
  plugins: [
    monorepoAlias({
      root: fileURLToPath(new URL('./', import.meta.url)),
      sourceRoot: 'src',
      /**
       * you package path
       * packages/foo
       * packages/bar
       */
      workspacePaths: [/^\/apps\//u, /^\/packages\//u],
    })
  ]
})
```