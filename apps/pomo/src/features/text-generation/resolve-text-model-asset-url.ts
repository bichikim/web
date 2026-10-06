import type {TextModelAssetSource} from './model'

export interface ResolveTextModelAssetUrlOptions {
  readonly assetSource: TextModelAssetSource
  readonly repositoryId: string
  readonly relativePath: string
}

/** Resolves an asset path against the model repository and revision. */
export const resolveTextModelAssetUrl = (options: ResolveTextModelAssetUrlOptions): string => {
  const path = options.assetSource.pathTemplate
    .replaceAll('{model}', options.repositoryId)
    .replaceAll('{revision}', options.assetSource.revision)
  return new URL(`${path}${options.relativePath}`, options.assetSource.host).href
}
