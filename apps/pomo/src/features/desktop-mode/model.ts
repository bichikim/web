import type {DesktopMode} from './is-desktop-mode'
import {
  type DesktopModeStorage,
  readCleanExitStorage,
  readDesktopModeStorage,
  writeCleanExitStorage,
  writeDesktopModeStorage,
} from './storage'

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
