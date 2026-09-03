import {batch, createEffect, createSignal, onCleanup, onMount} from 'solid-js'

import {
  type DisplayThemeController,
  type DisplayThemePreference,
  resolveDisplayColorScheme,
} from './model'
import {readDisplayThemePreference, writeDisplayThemePreference} from './storage'

const applyDocumentTheme = (preference: DisplayThemePreference, prefersDark: boolean) => {
  const isDark = resolveDisplayColorScheme(preference, prefersDark) === 'dark'
  document.documentElement.classList.toggle('dark', isDark)
}

/** Owns the saved theme preference and applies it to the browser document. */
export const useDisplayThemeController = (): DisplayThemeController => {
  const [preference, setPreference] = createSignal<DisplayThemePreference>('system')
  const [prefersDark, setPrefersDark] = createSignal(false)
  const [isPreferenceReady, setIsPreferenceReady] = createSignal(false)
  let preferenceRevision = 0
  let isDisposed = false

  const onPreferenceChange = (nextPreference: DisplayThemePreference) => {
    preferenceRevision += 1
    batch(() => {
      setPreference(nextPreference)
      setIsPreferenceReady(true)
    })
    writeDisplayThemePreference(nextPreference).catch(() => {
      // The current session keeps the selected theme when persistence is unavailable.
    })
  }

  onMount(() => {
    const mediaQuery = globalThis.matchMedia('(prefers-color-scheme: dark)')
    const initialPreferenceRevision = preferenceRevision
    setPrefersDark(mediaQuery.matches)

    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      setPrefersDark(event.matches)
    }
    mediaQuery.addEventListener('change', handleSystemThemeChange)

    createEffect(() => {
      if (isPreferenceReady()) {
        applyDocumentTheme(preference(), prefersDark())
      }
    })

    readDisplayThemePreference()
      .then((storedPreference) => {
        if (!isDisposed && preferenceRevision === initialPreferenceRevision) {
          batch(() => {
            setPreference(storedPreference)
            setIsPreferenceReady(true)
          })
        }
      })
      .catch(() => {
        // Storage adapters already recover to the system preference.
      })

    onCleanup(() => {
      isDisposed = true
      mediaQuery.removeEventListener('change', handleSystemThemeChange)
    })
  })

  return {onPreferenceChange, preference}
}
