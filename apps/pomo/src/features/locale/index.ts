import {getLocale, setLocale} from '@paraglide/runtime'
import {createSignal} from 'solid-js'

export * from './reset'

const [localeVersion, setLocaleVersion] = createSignal(0)

/** Reads the current locale and tracks changes made through the application setter. */
export const getAppLocale = (): ReturnType<typeof getLocale> => {
  localeVersion()
  return getLocale()
}

/** Preserves Paraglide's reload behavior and updates mounted locale-dependent data. */
export const setAppLocale: typeof setLocale = async (locale, options) => {
  await setLocale(locale, options)
  setLocaleVersion((version) => version + 1)
}
