import {cookieDomain, cookieName, localStorageKey, strategy} from '@paraglide/runtime'

const LOCALE_STORAGE_STRATEGIES = ['cookie', 'localStorage'] as const

export const LOCALE_RESET_STORAGE_COUNT = LOCALE_STORAGE_STRATEGIES.filter((storageStrategy) =>
  strategy.includes(storageStrategy),
).length

export interface LocaleResetStorage {
  readonly removeCookie: (cookie: string) => void
  readonly removeWeb: (key: string) => void
}

const getLocaleCookieDeletion = (): string => {
  const domain = cookieDomain ? `; domain=${cookieDomain}` : ''
  return `${cookieName}=; path=/; max-age=0${domain}`
}

export const resetLocale = async (storage: LocaleResetStorage): Promise<void> => {
  if (strategy.includes('localStorage')) {
    storage.removeWeb(localStorageKey)
  }

  storage.removeCookie(getLocaleCookieDeletion())
}
