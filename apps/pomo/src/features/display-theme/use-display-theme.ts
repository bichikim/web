import {createEffect, createSignal, onCleanup, onMount} from 'solid-js'

import {usePreference} from 'src/hooks/use-preference'
import {createParsedPreferenceStorage} from '../parsed-preference-storage'

import {
  DEFAULT_DISPLAY_THEME,
  DISPLAY_THEME_STORAGE_KEY,
  type DisplayThemeController,
  type DisplayThemePreference,
  resolveDisplayColorScheme,
} from './model'
import {
  parseDisplayThemePreference,
  readDisplayThemePreference,
  writeDisplayThemePreference,
} from './storage'

const displayThemeStorage = createParsedPreferenceStorage({
  invalidMessage: 'Invalid display theme preference.',
  parse: parseDisplayThemePreference,
  read: () => readDisplayThemePreference(),
  write: (value) => writeDisplayThemePreference(value),
})

const applyDocumentTheme = (preference: DisplayThemePreference, prefersDark: boolean) => {
  const isDark = resolveDisplayColorScheme(preference, prefersDark) === 'dark'
  globalThis.document.documentElement.classList.toggle('dark', isDark)
}

/** Shares the saved theme preference and applies it to the browser document. */
export const useDisplayThemeController = (): DisplayThemeController => {
  const [storedPreference, setStoredPreference] = usePreference({
    defaultValue: DEFAULT_DISPLAY_THEME,
    key: DISPLAY_THEME_STORAGE_KEY,
    onError: () => undefined,
    parse: parseDisplayThemePreference,
    storage: displayThemeStorage,
  })
  const [prefersDark, setPrefersDark] = createSignal(false)
  const preference = () => storedPreference() ?? DEFAULT_DISPLAY_THEME

  const onPreferenceChange = (nextPreference: DisplayThemePreference) => {
    setStoredPreference(nextPreference)
  }

  onMount(() => {
    const mediaQuery = globalThis.matchMedia('(prefers-color-scheme: dark)')
    setPrefersDark(mediaQuery.matches)

    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      setPrefersDark(event.matches)
    }
    mediaQuery.addEventListener('change', handleSystemThemeChange)

    createEffect(() => {
      applyDocumentTheme(preference(), prefersDark())
    })

    onCleanup(() => mediaQuery.removeEventListener('change', handleSystemThemeChange))
  })

  return {onPreferenceChange, preference}
}
