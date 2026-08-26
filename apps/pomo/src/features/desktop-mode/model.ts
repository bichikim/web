export const DESKTOP_MODE_STORAGE_KEY = 'pomo:desktop-mode:v1'
export const DESKTOP_CLEAN_EXIT_STORAGE_KEY = 'pomo:desktop-clean-exit:v1'

export type DesktopMode = 'desktop' | 'normal' | 'widget'
export type DesktopBackgroundInteraction = 'interactive' | 'passThrough'

export const isDesktopMode = (value: unknown): value is DesktopMode =>
  value === 'normal' || value === 'widget' || value === 'desktop'

export const readDesktopMode = (): DesktopMode => {
  try {
    const value = localStorage.getItem(DESKTOP_MODE_STORAGE_KEY)
    return isDesktopMode(value) ? value : 'normal'
  } catch {
    return 'normal'
  }
}

export const writeDesktopMode = (mode: DesktopMode): void => {
  try {
    localStorage.setItem(DESKTOP_MODE_STORAGE_KEY, mode)
  } catch {
    // The native mode still works when WebView storage is unavailable.
  }
}

export const readCleanExit = (): boolean => {
  try {
    return localStorage.getItem(DESKTOP_CLEAN_EXIT_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export const writeCleanExit = (isClean: boolean): void => {
  try {
    localStorage.setItem(DESKTOP_CLEAN_EXIT_STORAGE_KEY, String(isClean))
  } catch {
    // Crash recovery falls back to normal mode when persistence is unavailable.
  }
}
