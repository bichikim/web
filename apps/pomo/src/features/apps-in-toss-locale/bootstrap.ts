import {
  extractLocaleFromCookie,
  extractLocaleFromNavigator,
  type Locale,
  localStorageKey,
  toLocale,
} from '@paraglide/runtime'
import {resolveAppsInTossLocale} from './index'

const readStoredLocale = () => {
  try {
    return toLocale(window.localStorage.getItem(localStorageKey))
  } catch {
    return undefined
  }
}

const readDeviceLocale = async (): Promise<unknown> => {
  try {
    const framework = await import('@apps-in-toss/web-framework')

    return framework.Device?.locale ?? (await framework.getLocale())
  } catch {
    return undefined
  }
}

/** Resolves the initial locale before the client-rendered Apps in Toss home mounts. */
export const getInitialAppsInTossLocale = async (): Promise<Locale> => {
  const browserLocale = extractLocaleFromNavigator()
  const persistedLocale = readStoredLocale() ?? extractLocaleFromCookie()
  const deviceLocale = await readDeviceLocale()

  return resolveAppsInTossLocale({
    browserLocale,
    deviceLocale,
    persistedLocale,
  })
}
