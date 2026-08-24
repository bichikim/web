import {
  extractLocaleFromCookie,
  extractLocaleFromNavigator,
  localStorageKey,
  toLocale,
} from '../../paraglide/runtime.js'
import {resolveLocaleRedirect} from './index.ts'

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

/** Reads the native locale and returns the SSG URL required before hydration. */
export const getLocaleRedirect = async (currentUrl: URL): Promise<URL | undefined> => {
  const browserLocale = extractLocaleFromNavigator()
  const persistedLocale = readStoredLocale() ?? extractLocaleFromCookie()
  const deviceLocale = await readDeviceLocale()

  return resolveLocaleRedirect({
    browserLocale,
    currentUrl,
    deviceLocale,
    persistedLocale,
  })
}
