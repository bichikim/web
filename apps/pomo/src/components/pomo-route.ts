import {normalizePathname} from 'src/utils/normalize-pathname'
export {normalizePathname} from 'src/utils/normalize-pathname'
import {SEARCH_CONFIG} from 'src/features/search-discovery'

const SEARCH_INDEXABLE_PATHS: ReadonlySet<string> = new Set(SEARCH_CONFIG.indexablePaths)

export const getCanonicalPathname = normalizePathname

export const isSearchIndexablePath = (pathname: string) => {
  const canonicalPathname = normalizePathname(pathname)

  return (
    !(import.meta.env.VITE_POMO_IS_APPS_IN_TOSS === 'true') &&
    !(import.meta.env.VITE_POMO_IS_MOBILE === 'true') &&
    SEARCH_INDEXABLE_PATHS.has(canonicalPathname)
  )
}
