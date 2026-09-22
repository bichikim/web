import type {DesktopMode} from './model'

export const DESKTOP_MODE_STORAGE_KEY = 'pomo:desktop-mode:v1'
export const DESKTOP_CLEAN_EXIT_STORAGE_KEY = 'pomo:desktop-clean-exit:v1'
export const DESKTOP_MODE_OWNER_STORAGE_KEY = 'pomo:desktop-mode-owner:v1'

export type DesktopModeOwnerState = 'primary' | 'released'

export interface DesktopModeStorage {
  readonly getItem: (key: string) => string | null
  readonly setItem: (key: string, value: string) => void
}

const getStorage = (storage?: DesktopModeStorage): DesktopModeStorage =>
  storage ?? globalThis.localStorage

const isSupportedDesktopMode = (value: unknown): value is DesktopMode =>
  value === 'normal' || value === 'widget' || value === 'desktop' || value === 'interactiveDesktop'

const isSupportedDesktopModeOwnerState = (value: unknown): value is DesktopModeOwnerState =>
  value === 'primary' || value === 'released'

/** Reads the persisted desktop mode, falling back to normal mode when storage is unavailable. */
export const readDesktopModeStorage = (storage?: DesktopModeStorage): DesktopMode => {
  try {
    const value = getStorage(storage).getItem(DESKTOP_MODE_STORAGE_KEY)
    return isSupportedDesktopMode(value) ? value : 'normal'
  } catch {
    return 'normal'
  }
}

/** Persists the desktop mode while allowing native mode to work without web storage. */
export const writeDesktopModeStorage = (mode: DesktopMode, storage?: DesktopModeStorage): void => {
  try {
    getStorage(storage).setItem(DESKTOP_MODE_STORAGE_KEY, mode)
  } catch {
    // The native mode still works when WebView storage is unavailable.
  }
}

/** Reads whether the previous desktop session exited cleanly. */
export const readCleanExitStorage = (storage?: DesktopModeStorage): boolean => {
  try {
    return getStorage(storage).getItem(DESKTOP_CLEAN_EXIT_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

/** Persists clean-exit state while allowing crash recovery without web storage. */
export const writeCleanExitStorage = (isClean: boolean, storage?: DesktopModeStorage): void => {
  try {
    getStorage(storage).setItem(DESKTOP_CLEAN_EXIT_STORAGE_KEY, String(isClean))
  } catch {
    // Crash recovery falls back to normal mode when persistence is unavailable.
  }
}

/** Reads whether the primary mode controller has handed ownership to a control surface. */
export const readDesktopModeOwnerStorage = (
  storage?: DesktopModeStorage,
): DesktopModeOwnerState => {
  try {
    const value = getStorage(storage).getItem(DESKTOP_MODE_OWNER_STORAGE_KEY)
    return isSupportedDesktopModeOwnerState(value) ? value : 'primary'
  } catch {
    return 'primary'
  }
}

/** Persists the current desktop mode controller ownership state. */
export const writeDesktopModeOwnerStorage = (
  state: DesktopModeOwnerState,
  storage?: DesktopModeStorage,
): void => {
  try {
    getStorage(storage).setItem(DESKTOP_MODE_OWNER_STORAGE_KEY, state)
  } catch {
    // Mode ownership still converges through BroadcastChannel when storage is unavailable.
  }
}
