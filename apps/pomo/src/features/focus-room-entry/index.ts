const ENTRY_SESSION_KEY = 'pomo:focus-room-entry:v1'

export interface FocusRoomEntrySessionStorage {
  readonly getItem: (key: string) => string | null
  readonly setItem: (key: string, value: string) => void
}

const getStorage = (storage?: FocusRoomEntrySessionStorage): FocusRoomEntrySessionStorage =>
  storage ?? globalThis.sessionStorage

/** Returns whether the focus-room intro was completed in the current browser session. */
export const readFocusRoomEntrySession = (storage?: FocusRoomEntrySessionStorage): boolean => {
  try {
    return getStorage(storage).getItem(ENTRY_SESSION_KEY) !== null
  } catch {
    return false
  }
}

/** Marks the focus-room intro as completed for the current browser session. */
export const writeFocusRoomEntrySession = (storage?: FocusRoomEntrySessionStorage): void => {
  try {
    getStorage(storage).setItem(ENTRY_SESSION_KEY, 'true')
  } catch {
    // Browser storage is best-effort; entering the focus room must remain available.
  }
}
