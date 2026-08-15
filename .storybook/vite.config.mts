import {monorepoAlias} from '@winter-love/vite-plugin-monorepo-alias'
import {fileURLToPath, URL} from 'node:url'
import unoCss from '@unocss/vite'
import {defineConfig, type Plugin} from 'vite'

export default defineConfig({
  plugins: [
    unoCss('../../'),
    monorepoAlias({
      alias: {
        'apps/pomo': {
          assets: 'assets',
          src: 'src',
        },
      },
      root: fileURLToPath(new URL('../', import.meta.url)),
      workspacePaths: [/\/apps\//u, /\/packages\//u],
    }) as Plugin,
  ],
})
