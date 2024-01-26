import {createCustomResolver, CustomResolverOptions} from './custom-resolver'
import {createAliasRegexp} from './alias-regexp'
import type {Plugin} from 'vite'

export type VitePluginMonorepoOptions = CustomResolverOptions

/**
 * vite plugin
 * @param options
 */
export const monorepoAlias = (options: VitePluginMonorepoOptions): Plugin => {
  const {sourceRoot = './'} = options
  return {
    config: () => {
      return {
        resolve: {
          alias: [
            {
              customResolver: createCustomResolver({...options, sourceRoot}),
              find: createAliasRegexp(sourceRoot),
              replacement: `$1`,
            },
          ],
        },
      }
    },
    enforce: 'pre',
    name: 'monorepo-alias',
  }
}
