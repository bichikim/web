import {
  type DesktopModeStorage,
  readCleanExitStorage,
  readDesktopModeStorage,
  writeCleanExitStorage,
  writeDesktopModeStorage,
} from './storage'

export {
  DESKTOP_CLEAN_EXIT_STORAGE_KEY,
  DESKTOP_MODE_STORAGE_KEY,
  DESKTOP_MODE_OWNER_STORAGE_KEY,
  readCleanExitStorage,
  readDesktopModeOwnerStorage,
  readDesktopModeStorage,
  writeCleanExitStorage,
  writeDesktopModeOwnerStorage,
  writeDesktopModeStorage,
} from './storage'
export type {DesktopModeOwnerState, DesktopModeStorage} from './storage'

export type DesktopMode = 'desktop' | 'interactiveDesktop' | 'normal' | 'widget'

export const isDesktopMode = (value: unknown): value is DesktopMode =>
  value === 'normal' || value === 'widget' || value === 'desktop' || value === 'interactiveDesktop'

export const isDesktopBackgroundMode = (mode: DesktopMode): boolean =>
  mode === 'desktop' || mode === 'interactiveDesktop'

export const readDesktopMode = (storage?: DesktopModeStorage): DesktopMode =>
  readDesktopModeStorage(storage)

export const writeDesktopMode = (mode: DesktopMode, storage?: DesktopModeStorage): void =>
  writeDesktopModeStorage(mode, storage)

export const readCleanExit = (storage?: DesktopModeStorage): boolean =>
  readCleanExitStorage(storage)

export const writeCleanExit = (isClean: boolean, storage?: DesktopModeStorage): void =>
  writeCleanExitStorage(isClean, storage)
