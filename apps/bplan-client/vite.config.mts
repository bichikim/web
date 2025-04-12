/* eslint-disable unicorn/import-style */
/* eslint-disable no-tabs,max-len */
import {defineConfig} from '@solidjs/start/config'
import {Plugin} from 'vite'
import {fileURLToPath, URL} from 'node:url'
import * as path from 'node:path'
import {generateSW} from '@winter-love/sw'
import unoCss from 'unocss/vite'
import * as nodeFs from 'node:fs'
import legacy from '@vitejs/plugin-legacy'
import {targets} from '@winter-love/vite-lib-config'

/**
 * fix nitro function
 * for vercel case
 * uses via vite.config.mts -> hooks: {close: () => {return hotfix()}}
 */
const fixNitroFunction = async () => {
  const source =
    process.env.VERCEL === '1'
      ? path.resolve('.vercel/output/functions/__nitro.func/chunks/nitro/nitro.mjs')
      : path.resolve('.output/server/chunks/nitro/nitro.mjs')
  const scriptJs = await nodeFs.promises.readFile(source, 'utf8')

  await nodeFs.promises.writeFile(
    source,
    scriptJs.replace(
      `
function getDefaultExportFromNamespaceIfNotNamed (n) {
	return n && Object.prototype.hasOwnProperty.call(n, 'default') && Object.keys(n).length === 1 ? n['default'] : n;
}`,
      `
// hot fixed
function getDefaultExportFromNamespaceIfNotNamed (n) {
	return n && Object.prototype.hasOwnProperty.call(n, 'default') && (Object.keys(n).length === 1 || (Object.prototype.hasOwnProperty.call(n, '__esModule') && Object.keys(n).length === 2) ) ? n['default'] : n;
}`,
    ),
    'utf8',
  )
}

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
  await fixNitroFunction()
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
    build: {
      minify: true,
    },
    plugins: [
      // uno css plugin
      unoCss({
        configFile: '../../uno.config.ts',
      }),
      // create generate sw plugin
      createGenerateSwPlugin(),
      // legacy plugin
      legacy({
        targets,
      }),
    ] as any,
    resolve: {
      alias: {
        // fix #start/app is app.tsx only @solid/state error
        '#start/app': fileURLToPath(new URL('src/App.tsx', import.meta.url)),
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
