import {SEARCH_CONFIG} from '../features/search-discovery/canonical'
import {deLocalizeHref, type Locale, locales, localizeHref} from '@paraglide/runtime'

const POMO_LAYOUT_PATHS: ReadonlySet<string> = new Set(['/', '/dialogue'])
const SEARCH_INDEXABLE_PATHS: ReadonlySet<string> = new Set(SEARCH_CONFIG.indexablePaths)

export const normalizePathname = (pathname: string) => {
  const pathWithoutTrailingSlash = pathname.replace(/\/+$/u, '') || '/'
  return deLocalizeHref(pathWithoutTrailingSlash).replace(/\/+$/u, '') || '/'
}

const getPathLocale = (pathname: string): Locale | undefined => {
  const [, pathLocale] = pathname.split('/')
  return locales.find((locale) => locale === pathLocale)
}

export const getCanonicalPathname = (pathname: string) => {
  const locale = getPathLocale(pathname)
  const canonicalPathname = normalizePathname(pathname)

  return locale === undefined ? canonicalPathname : localizeHref(canonicalPathname, {locale})
}

export const getPomoHomeHref = (locale: Locale) =>
  import.meta.env.POMO_IS_APPS_IN_TOSS ? '/' : localizeHref('/', {locale})

export const isPomoHomePath = (pathname: string) =>
  normalizePathname(pathname) === '/' &&
  (import.meta.env.POMO_IS_APPS_IN_TOSS || getPathLocale(pathname) !== undefined)

export const isSearchIndexablePath = (pathname: string) => {
  const canonicalPathname = normalizePathname(pathname)

  return (
    !import.meta.env.POMO_IS_APPS_IN_TOSS &&
    !(canonicalPathname === '/' && getPathLocale(pathname) === undefined) &&
    SEARCH_INDEXABLE_PATHS.has(canonicalPathname)
  )
}

export const usesPomoLayout = (pathname: string) => {
  const canonicalPathname = normalizePathname(pathname)

  return (
    POMO_LAYOUT_PATHS.has(canonicalPathname) &&
    !(
      canonicalPathname === '/' &&
      !import.meta.env.POMO_IS_APPS_IN_TOSS &&
      getPathLocale(pathname) === undefined
    )
  )
}
