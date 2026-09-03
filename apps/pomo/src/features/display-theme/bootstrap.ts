import {DISPLAY_THEME_STORAGE_KEY} from './model'

const DARK_THEME_COLOR = '#17130f'
const BRIGHT_THEME_COLOR = '#f7f8fa'

/** Applies the locally available preference before application hydration begins. */
export const initializeDisplayThemeDocument = () => {
  let preference = 'system'

  try {
    const storedPreference = JSON.parse(
      globalThis.localStorage.getItem(DISPLAY_THEME_STORAGE_KEY) ?? 'null',
    ) as unknown

    if (
      storedPreference === 'bright' ||
      storedPreference === 'dark' ||
      storedPreference === 'system'
    ) {
      preference = storedPreference
    }
  } catch {
    // Browser storage is best effort during document initialization.
  }

  const prefersDark = globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  const isDark = preference === 'dark' || (preference === 'system' && prefersDark)
  const colorScheme = isDark ? 'dark' : 'light'

  document.documentElement.dataset.colorScheme = colorScheme
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', isDark ? DARK_THEME_COLOR : BRIGHT_THEME_COLOR)
}

export const DISPLAY_THEME_BOOTSTRAP_SCRIPT = `(() => {
  let preference = "system"
  try {
    const storedPreference = JSON.parse(
      globalThis.localStorage.getItem(${JSON.stringify(DISPLAY_THEME_STORAGE_KEY)}) ?? "null",
    )
    if (
      storedPreference === "bright" ||
      storedPreference === "dark" ||
      storedPreference === "system"
    ) {
      preference = storedPreference
    }
  } catch {}
  const prefersDark =
    globalThis.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false
  const isDark =
    preference === "dark" || (preference === "system" && prefersDark)
  const colorScheme = isDark ? "dark" : "light"
  document.documentElement.dataset.colorScheme = colorScheme
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    "content",
    isDark ? ${JSON.stringify(DARK_THEME_COLOR)} : ${JSON.stringify(BRIGHT_THEME_COLOR)},
  )
})()`
