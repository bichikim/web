import {LOCALIZED_STATIC_ROUTES} from 'src/config/static-localization'
import {
  baseLocale,
  deLocalizeUrl,
  extractLocaleFromUrl,
  type Locale,
  localizeUrl,
  toLocale,
} from '../../paraglide/runtime.js'

interface ResolveLocaleRedirectOptions {
  readonly browserLocale?: Locale
  readonly currentUrl: URL
  readonly deviceLocale?: unknown
  readonly persistedLocale?: Locale
}

export const normalizeDeviceLocale = (value: unknown): Locale | undefined => {
  const exactLocale = toLocale(value)

  if (exactLocale !== undefined || typeof value !== 'string') {
    return exactLocale
  }

  const [language] = value.split(/[-_]/u)
  return toLocale(language)
}

const isLocalizedRoute = (pathname: string) =>
  LOCALIZED_STATIC_ROUTES.some((route) => route === pathname)

/** Resolves a full-document navigation before SolidStart mounts an Apps in Toss page. */
export const resolveLocaleRedirect = (options: ResolveLocaleRedirectOptions): URL | undefined => {
  const canonicalUrl = deLocalizeUrl(options.currentUrl)
  canonicalUrl.pathname = canonicalUrl.pathname.replace(/\/+$/u, '') || '/'

  if (!isLocalizedRoute(canonicalUrl.pathname)) {
    return undefined
  }

  const locale =
    options.persistedLocale ??
    normalizeDeviceLocale(options.deviceLocale) ??
    options.browserLocale ??
    baseLocale
  const currentLocale = extractLocaleFromUrl(options.currentUrl)

  const localizedUrl = localizeUrl(canonicalUrl, {locale})

  if (locale === currentLocale && localizedUrl.pathname === options.currentUrl.pathname) {
    return undefined
  }

  return localizedUrl
}
