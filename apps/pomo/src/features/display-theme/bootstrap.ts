import {DEFAULT_DISPLAY_THEME, DISPLAY_THEME_STORAGE_KEY} from './model'

export const DISPLAY_THEME_BOOTSTRAP_SCRIPT = `(() => {
  let preference = ${JSON.stringify(DEFAULT_DISPLAY_THEME)}
  try {
    const storedValue = JSON.parse(
      globalThis.localStorage.getItem(${JSON.stringify(DISPLAY_THEME_STORAGE_KEY)}) ?? "null",
    )
    const storedPreference =
      storedValue !== null &&
      typeof storedValue === "object" &&
      typeof storedValue.savedAt === "number" &&
      Number.isFinite(storedValue.savedAt) &&
      storedValue.savedAt >= 0
        ? storedValue.preference
        : storedValue
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
  document.documentElement.classList.toggle("dark", isDark)
})()`
