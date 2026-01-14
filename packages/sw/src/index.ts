import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {getInstallFiles} from './get-install-files'
import type {Plugin, ResolvedConfig} from 'vite'

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

  // SolidStart extends ResolvedConfig with router property
  type SolidStartConfig = ResolvedConfig & {
    router: {type: string; outDir: string}
  }

  let _config: SolidStartConfig | undefined

  const cleanUp = async () => {
    if (!_config) return
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
      configResolved(config: ResolvedConfig) {
        // Type guard to check if config has router property (SolidStart extension)
        if (
          'router' in config &&
          typeof config.router === 'object' &&
          config.router !== null &&
          'type' in config.router &&
          'outDir' in config.router
        ) {
          const solidStartConfig = config as SolidStartConfig
          if (solidStartConfig.router.type === 'client' && config.mode === 'production') {
            _config = solidStartConfig
          }
        }
      },
      name: 'generate-sw',
    },
  }
}
