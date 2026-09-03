import {
  baseLocale,
  cookieDomain,
  cookieName,
  type Locale,
  localStorageKey,
  strategy,
  toLocale,
} from '@paraglide/runtime'

export interface LocaleResetStorage {
  readonly isNative: () => boolean
  readonly removeCookie: (cookie: string) => void
  readonly removeNative: (key: string) => Promise<void>
  readonly removeWeb: (key: string) => void
}

const getLocaleCookieDeletion = (): string => {
  const domain = cookieDomain ? `; domain=${cookieDomain}` : ''
  return `${cookieName}=; path=/; max-age=0${domain}`
}

export const resetLocale = async (storage: LocaleResetStorage): Promise<void> => {
  if (strategy.includes('localStorage')) {
    if (storage.isNative()) {
      await storage.removeNative(localStorageKey)
    }

    storage.removeWeb(localStorageKey)
  }

  storage.removeCookie(getLocaleCookieDeletion())
}

interface ResolveAppsInTossLocaleOptions {
  readonly browserLocale?: Locale
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

export const resolveAppsInTossLocale = (options: ResolveAppsInTossLocaleOptions): Locale =>
  options.persistedLocale ??
  normalizeDeviceLocale(options.deviceLocale) ??
  options.browserLocale ??
  baseLocale
