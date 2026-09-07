import {SEARCH_CONFIG} from '../features/search-discovery/canonical'

const POMO_LAYOUT_PATHS: ReadonlySet<string> = new Set(['/', '/dialogue'])
const SEARCH_INDEXABLE_PATHS: ReadonlySet<string> = new Set(SEARCH_CONFIG.indexablePaths)

export const normalizePathname = (pathname: string) => {
  return pathname.replace(/\/+$/u, '') || '/'
}

export const getCanonicalPathname = normalizePathname

export const isPomoHomePath = (pathname: string) => normalizePathname(pathname) === '/'

export const isSearchIndexablePath = (pathname: string) => {
  const canonicalPathname = normalizePathname(pathname)

  return (
    !(import.meta.env.VITE_POMO_IS_APPS_IN_TOSS === 'true') &&
    SEARCH_INDEXABLE_PATHS.has(canonicalPathname)
  )
}

export const usesPomoLayout = (pathname: string) => {
  const canonicalPathname = normalizePathname(pathname)

  return POMO_LAYOUT_PATHS.has(canonicalPathname)
}
