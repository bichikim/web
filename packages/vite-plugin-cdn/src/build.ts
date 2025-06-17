import type {Plugin, ResolvedConfig} from 'vite'
import type {CdnOptions, Module} from './types'
import {createGetModule, DEFAULT_PREFIX} from './share'
import path from 'node:path'
import fs from 'node:fs'
import {fetchModules} from './fetch-modules'
import {createWriteModuleMap} from './create-write-module-map'

type GetModule = (url: string) => Promise<Module | null>

const writeFile = async (filePath: string, content: string) => {
  await fs.promises.mkdir(path.dirname(filePath), {recursive: true})
  await fs.promises.writeFile(filePath, content)

  return filePath
}

export const cdnBuildWithCleanUp = (
  options: CdnOptions = {},
): {cleanUp: () => Promise<void>; pluginOptions: Plugin} => {
  const {
    prefix = DEFAULT_PREFIX,
    sourceMap = {},
    publicPath = 'public',
    preventCleanUpOnCloseBundle = false,
    root,
    workOn,
  } = options
  let config: ResolvedConfig
  let writeModuleMap: Record<string, string>

  const getModule = createGetModule()

  const cleanUp = async () => {
    try {
      await fs.promises.rm(path.join(root ?? config.root, publicPath, prefix), {force: true, recursive: true})
    } catch {
      // skip
    }
  }

  return {
    cleanUp,
    pluginOptions: {
      async buildStart() {
        if (workOn && !workOn(config)) {
          return
        }

        writeModuleMap = createWriteModuleMap(path.join(root ?? config.root, publicPath), sourceMap, prefix)
        const modules = await fetchModules(writeModuleMap, getModule)

        await Promise.all(
          modules.map(async ([key, value]) => {
            return writeFile(key, value)
          }),
        )
      },
      async closeBundle() {
        if (preventCleanUpOnCloseBundle) {
          return
        }

        await cleanUp()
      },
      configResolved(_config) {
        config = _config
      },
      name: 'vite-plugin-cdn:build',
    },
  }
}

export const cdnBuild = (options: CdnOptions = {}): Plugin => {
  const {pluginOptions} = cdnBuildWithCleanUp(options)

  return pluginOptions
}
