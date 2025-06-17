import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {getInstallFiles} from './get-install-files'
import type {Plugin} from 'vite'

export const INJECT_TARGET = '__inject_code__'
export const libraryRoot = path.dirname(fileURLToPath(new URL(import.meta.url)))

export interface GenerateSWOptions {
  assets: string
  assetsRoot: string
  cwd: string
}

export const generateSW = async (distribution: string, options: GenerateSWOptions) => {
  const {assets, assetsRoot, cwd = process.cwd()} = options
  const swFile = await fs.promises.readFile(path.join(libraryRoot, 'sw.mjs'), 'utf8')
  const installFiles = await getInstallFiles({cwd, files: assets, root: assetsRoot})

  await fs.promises.writeFile(path.join(cwd, distribution), swFile.replace(INJECT_TARGET, JSON.stringify(installFiles)))
}

export interface GenerateSwPluginOptions {
  publicPath?: string
  root?: string
}

/**
 * create generate sw plugin
 */
export const generateSwWithCleanUp = (
  options: GenerateSwPluginOptions,
): {cleanUp: () => Promise<void>; pluginOptions: Plugin} => {
  const {publicPath = 'public', root} = options
  let _config: any | undefined

  const cleanUp = async () => {
    await fs.promises.rm(path.join(root ?? _config.root, publicPath, 'sw.js'), {force: true})
  }

  return {
    cleanUp,
    pluginOptions: {
      async closeBundle() {
        if (!_config) {
          return
        }
        const {outDir} = _config.router
        const swOutPath = path.join(root ?? _config.root, publicPath, 'sw.js')

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
    },
  }
}
