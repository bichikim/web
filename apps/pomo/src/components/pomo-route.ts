import {SEARCH_CONFIG} from '../config/search'

const POMO_LAYOUT_PATHS: ReadonlySet<string> = new Set(['/', '/dialogue'])
const SEARCH_INDEXABLE_PATHS: ReadonlySet<string> = new Set(SEARCH_CONFIG.indexablePaths)

export const normalizePathname = (pathname: string) => pathname.replace(/\/+$/u, '') || '/'

export const isPomoHomePath = (pathname: string) => normalizePathname(pathname) === '/'

export const isSearchIndexablePath = (pathname: string) =>
  !import.meta.env.POMO_IS_APPS_IN_TOSS && SEARCH_INDEXABLE_PATHS.has(normalizePathname(pathname))

export const usesPomoLayout = (pathname: string) =>
  POMO_LAYOUT_PATHS.has(normalizePathname(pathname))
