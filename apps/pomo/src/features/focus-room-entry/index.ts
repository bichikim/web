const ENTRY_SESSION_KEY = 'pomo:focus-room-entry:v1'

/** Returns whether the focus-room intro was completed in the current browser session. */
export const readFocusRoomEntrySession = (): boolean => {
  try {
    return sessionStorage.getItem(ENTRY_SESSION_KEY) !== null
  } catch {
    return false
  }
}

/** Marks the focus-room intro as completed for the current browser session. */
export const writeFocusRoomEntrySession = (): void => {
  try {
    sessionStorage.setItem(ENTRY_SESSION_KEY, 'true')
  } catch {
    // Browser storage is best-effort; entering the focus room must remain available.
  }
}
