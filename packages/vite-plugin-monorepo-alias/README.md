# Vite Plugin Monorepo alias

A Vite plugin that helps Vite or Vite-based applications correctly resolve alias import paths in a monorepo environment.

This plugin provides the following features:

- Support for alias imports between packages within a monorepo workspace
- Relative path resolution based on source directory
- Compatible with TypeScript paths configuration
- Consistent path resolution during development and build

## Setting

```ts
import {defineConfig} from 'vite'
import {monorepoAlias} from '@winter-love/vite-plugin-monorepo-alias'

export default defineConfig({
  plugins: [
    monorepoAlias({
      alias: {
        // 특정 위치에 대한 alias
        'packages/utils': {
          '@': 'src',
        }
      }
      /**
       * Specify the project root path.
       */
      root: fileURLToPath(new URL('./', import.meta.url)),
      /**
       * Specify package paths within the monorepo workspace.
       * apps - All packages in the apps directory
       * packages - All packages in the packages directory
       */
      workspacePaths: [/\/apps\//u, /\/packages\//u],
    })
  ]
})
```
