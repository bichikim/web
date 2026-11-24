import {classifySemantics} from './classify'
import type {SemanticBinding, SemanticFrame} from '@winter-love/wallpaper/settings/semantics'

interface SemanticAnalysisOptions {
  /** Current connection examples and settings; changes invalidate cached scores. */
  readonly bindings: readonly SemanticBinding[]
  /** One completed meaning segment. */
  readonly text: string
}
const CACHE_LIMIT = 128

/** Caches completed segment scores; failed attempts remain retryable. */
export const createSemanticAnalysis = (
  embed: (texts: readonly string[]) => Promise<readonly (readonly number[])[]>,
) => {
  const cache = new Map<string, SemanticFrame['scores']>()
  return async (options: SemanticAnalysisOptions): Promise<SemanticFrame['scores']> => {
    const key = JSON.stringify([options.bindings, options.text])
    const cached = cache.get(key)
    if (cached !== undefined) {
      cache.delete(key)
      cache.set(key, cached)
      return cached
    }
    const scores = await classifySemantics({...options, embed})
    if (cache.size >= CACHE_LIMIT) {
      cache.delete(cache.keys().next().value!)
    }
    cache.set(key, scores)
    return scores
  }
}
