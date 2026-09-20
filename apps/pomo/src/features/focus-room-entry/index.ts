import {createPresenceFlag} from '../value-storage'
const ENTRY_SESSION_KEY = 'pomo:focus-room-entry:v1'

export interface FocusRoomEntrySessionStorage {
  readonly getItem: (key: string) => string | null
  readonly setItem: (key: string, value: string) => void
}

const getEntryFlag = (storage?: FocusRoomEntrySessionStorage) =>
  createPresenceFlag({key: ENTRY_SESSION_KEY, storage: () => storage ?? globalThis.sessionStorage})

/** Returns whether the focus-room intro was completed in the current browser session. */
export const readFocusRoomEntrySession = (storage?: FocusRoomEntrySessionStorage): boolean =>
  getEntryFlag(storage).read()

/** Marks the focus-room intro as completed for the current browser session. */
export const writeFocusRoomEntrySession = (storage?: FocusRoomEntrySessionStorage): void =>
  getEntryFlag(storage).write()
