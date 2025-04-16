/* eslint-disable unicorn/import-style */
import {defineConfig} from '@solidjs/start/config'
import UnoCSS from 'unocss/vite'
import {fileURLToPath} from 'node:url'
import * as nodeFs from 'node:fs'
import * as path from 'node:path'
import {Plugin} from 'vite'
import {generateSW} from '@winter-love/sw'
import {targets} from '@winter-love/vite-lib-config'
import legacy from '@vitejs/plugin-legacy'

/**
 * remove sw.js because it copied by vite build process
 */
const fixSw = async () => {
  return nodeFs.promises.rm(path.resolve('public/sw.js'))
}

/**
 * run all hotfix functions
 */
const hotfix = async () => {
  await fixSw()
}

/**
 * create generate sw plugin
 */
const createGenerateSwPlugin = (): Plugin => {
  let _config: any | undefined

  return {
    async closeBundle() {
      if (!_config) {
        return
      }
      const {outDir, root} = _config.router
      const swOutPath = path.join(root, 'public/sw.js')

      await generateSW(swOutPath, {
        assets: '_build/assets/**/*',
        assetsRoot: outDir,
        cwd: '',
      })
    },
    configResolved(config: any) {
      if (config.router.type === 'client' && config.mode === 'production') {
        _config = config
      }
    },
    name: 'generate-sw',
  }
}

export default defineConfig({
  middleware: 'src/middleware/index.ts',
  server: {
    hooks: {
      close: () => {
        return hotfix()
      },
    },
  },
  vite: {
    plugins: [
      //
      UnoCSS(),
      createGenerateSwPlugin(),
      legacy({
        targets,
      }),
    ],
    resolve: {
      alias: {
        // fix @tonejs/midi is not module js
        '@tonejs/midi': fileURLToPath(
          new URL('node_modules/@tonejs/midi/src/Midi.ts', import.meta.url),
        ),

        // root source path alias
        src: fileURLToPath(new URL('src', import.meta.url)),
      },
    },
  },
})
