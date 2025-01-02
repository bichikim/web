import {toAlias} from 'src/to-alias'
import type {Plugin} from 'vite'
import {createAliasRegexp} from './alias-regexp'
import {createCustomResolver, CustomResolverOptions} from './custom-resolver'

export interface VitePluginMonorepoOptions extends CustomResolverOptions {
  /**
   * same as object vite alias
   */
  alias?: Record<string, string>
}

/**
 * vite plugin
 * @param options
 */
export const monorepoAlias = (options: VitePluginMonorepoOptions): Plugin => {
  const {sourceRoot = './', alias = {}} = options

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
            ...toAlias(alias),
          ],
        },
      }
    },
    enforce: 'pre',
    name: 'monorepo-alias',
  }
}
