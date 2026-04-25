import fetch from 'node-fetch'
import {init, parse} from 'es-module-lexer'
import MagicString from 'magic-string'
import type {Plugin} from 'vite'
import {cdnBuild, cdnBuildWithCleanUp} from './build'
import {cdnServe} from './serve'
import type {CdnOptions} from './types'

export const cdnWithCleanUp = (
  options?: CdnOptions,
): {cleanUp: () => Promise<void>; pluginOptions: Plugin[]} => {
  const {pluginOptions, cleanUp} = cdnBuildWithCleanUp(options)

  return {
    cleanUp,
    pluginOptions: [pluginOptions, cdnServe(options)],
  }
}

export const cdn = (options?: CdnOptions): Plugin[] => {
  const {pluginOptions} = cdnWithCleanUp(options)

  return pluginOptions
}

export * from './build'
export * from './serve'
export * from './share'
export * from './types'
