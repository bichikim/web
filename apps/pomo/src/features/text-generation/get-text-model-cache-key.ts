import {getTextModelImplementation} from './model'
import {resolveTextModelAssetUrl} from './resolve-text-model-asset-url'

/** Returns the shared cache key for a model asset, including tokenizer migrations. */
export const getTextModelCacheKey = (url: string): string => {
  const model = getTextModelImplementation('gemma-4-e2b')
  const tokenizerUrl = resolveTextModelAssetUrl({...model, relativePath: 'tokenizer.json'})
  return url === tokenizerUrl ? `${url}?pomo-cache-version=1` : url
}
