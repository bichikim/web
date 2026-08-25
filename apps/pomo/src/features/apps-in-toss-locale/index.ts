import {baseLocale, type Locale, toLocale} from '@paraglide/runtime'

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
