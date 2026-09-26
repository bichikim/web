import {createBestEffortValueStorage, type ValueCodec} from '../value-storage'
import type {DesktopMode} from './model'

export const DESKTOP_MODE_STORAGE_KEY = 'pomo:desktop-mode:v1'
export const DESKTOP_CLEAN_EXIT_STORAGE_KEY = 'pomo:desktop-clean-exit:v1'
export const DESKTOP_MODE_OWNER_STORAGE_KEY = 'pomo:desktop-mode-owner:v1'

export interface DesktopModeStorage {
  readonly getItem: (key: string) => string | null
  readonly setItem: (key: string, value: string) => void
}

const getStorage = (storage?: DesktopModeStorage): DesktopModeStorage =>
  storage ?? globalThis.localStorage

const isSupportedDesktopMode = (value: unknown): value is DesktopMode =>
  value === 'normal' || value === 'widget' || value === 'desktop' || value === 'interactiveDesktop'

export type DesktopModeOwnerState = 'primary' | 'released'

const isSupportedDesktopModeOwnerState = (value: unknown): value is DesktopModeOwnerState =>
  value === 'primary' || value === 'released'

const modeCodec: ValueCodec<DesktopMode> = {
  decode: (stored) => (isSupportedDesktopMode(stored) ? stored : null),
  encode: (mode) => mode,
}
const cleanExitCodec: ValueCodec<boolean> = {
  decode: (stored) => stored === 'true',
  encode: String,
}
const createDesktopStorage = <Value>(
  key: string,
  codec: ValueCodec<Value>,
  storage?: DesktopModeStorage,
) =>
  createBestEffortValueStorage({
    ...codec,
    key,
    storage: () => getStorage(storage),
  })

/** Reads the persisted desktop mode, falling back to normal mode when storage is unavailable. */
export const readDesktopModeStorage = (storage?: DesktopModeStorage): DesktopMode => {
  return createDesktopStorage(DESKTOP_MODE_STORAGE_KEY, modeCodec, storage).read() ?? 'normal'
}

/** Persists the desktop mode while allowing native mode to work without web storage. */
export const writeDesktopModeStorage = (mode: DesktopMode, storage?: DesktopModeStorage): void => {
  createDesktopStorage(DESKTOP_MODE_STORAGE_KEY, modeCodec, storage).write(mode)
}

/** Reads whether the previous desktop session exited cleanly. */
export const readCleanExitStorage = (storage?: DesktopModeStorage): boolean => {
  return (
    createDesktopStorage(DESKTOP_CLEAN_EXIT_STORAGE_KEY, cleanExitCodec, storage).read() ?? false
  )
}

/** Persists clean-exit state while allowing crash recovery without web storage. */
export const writeCleanExitStorage = (isClean: boolean, storage?: DesktopModeStorage): void => {
  createDesktopStorage(DESKTOP_CLEAN_EXIT_STORAGE_KEY, cleanExitCodec, storage).write(isClean)
}

const ownerCodec: ValueCodec<DesktopModeOwnerState> = {
  decode: (stored) => (isSupportedDesktopModeOwnerState(stored) ? stored : null),
  encode: (state) => state,
}

/** Reads the persisted controller ownership, defaulting to the primary controller. */
export const readDesktopModeOwnerStorage = (storage?: DesktopModeStorage): DesktopModeOwnerState =>
  createDesktopStorage(DESKTOP_MODE_OWNER_STORAGE_KEY, ownerCodec, storage).read() ?? 'primary'

/** Persists the current desktop mode controller ownership state. */
export const writeDesktopModeOwnerStorage = (
  state: DesktopModeOwnerState,
  storage?: DesktopModeStorage,
): void => {
  createDesktopStorage(DESKTOP_MODE_OWNER_STORAGE_KEY, ownerCodec, storage).write(state)
}
