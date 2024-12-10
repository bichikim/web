import {monorepoAlias} from '@winter-love/vite-plugin-monorepo-alias'
import {fileURLToPath, URL} from 'node:url'
import unoCss from '@unocss/vite'
import {defineConfig, Plugin} from 'vite'

const resolvePath = (url: string) => fileURLToPath(new URL(`../${url}`, import.meta.url))
export default defineConfig({
  plugins: [
    unoCss('../../uno.config.ts'),
    monorepoAlias({
      alias: {
        '@winter-love/solid/test': resolvePath('packages/solid/src/test'),
        '@winter-love/solid/use': resolvePath('packages/solid/src/use'),
      },
      osPathDelimiter: process.platform === 'win32' ? '\\' : '/',
      root: fileURLToPath(new URL('../', import.meta.url)),
      sourceRoot: 'src',
      workspacePaths: [/^\/apps\//u, /^\/packages\//u],
    }) as Plugin,
  ],
})
