import type {Accessor} from 'solid-js'

export type DisplayColorScheme = 'dark' | 'light'
export type DisplayThemePreference = 'bright' | 'dark' | 'system'

export const DISPLAY_THEME_STORAGE_KEY = 'pomo:display-theme:v1'

export interface DisplayThemeController {
  readonly onPreferenceChange: (preference: DisplayThemePreference) => void
  readonly preference: Accessor<DisplayThemePreference>
}

/** Resolves a saved display preference to the browser color scheme currently in effect. */
export const resolveDisplayColorScheme = (
  preference: DisplayThemePreference,
  prefersDark: boolean,
): DisplayColorScheme => {
  switch (preference) {
    case 'dark':
      return 'dark'
    case 'bright':
      return 'light'
    case 'system':
      return prefersDark ? 'dark' : 'light'
  }

  const exhaustivePreference: never = preference
  return exhaustivePreference
}
