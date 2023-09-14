import {createCustomResolver, CustomResolverOptions} from './custom-resolver'
import {createAliasRegexp} from './alias-regexp'

export type VitePluginMonorepoOptions = CustomResolverOptions

export const monorepoAlias = (options: VitePluginMonorepoOptions) => {
  const {sourceRoot = './'} = options
  return {
    config: () => {
      return {
        alias: [
          {
            customResolver: createCustomResolver({...options, sourceRoot}),
            find: createAliasRegexp(sourceRoot),
            replacement: `$1`,
          },
        ],
      }
    },
    enforce: 'pre',
    name: 'monorepo-alias',
  }
}
