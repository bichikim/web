import {DISPLAY_THEME_STORAGE_KEY} from './model'

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
  document.documentElement.classList.toggle("dark", isDark)
})()`
