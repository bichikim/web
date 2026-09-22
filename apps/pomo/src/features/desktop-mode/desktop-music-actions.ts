export type DesktopMusicAction = 'music-start' | 'music-stop'

export interface DesktopMusicActionMessage {
  readonly actionId: DesktopMusicAction
}

const DESKTOP_MUSIC_ACTION_CHANNEL = 'pomo:desktop-music-action'

export const createDesktopMusicActionChannel = (): BroadcastChannel | null => {
  if (typeof globalThis.BroadcastChannel !== 'function') {
    return null
  }

  return new globalThis.BroadcastChannel(DESKTOP_MUSIC_ACTION_CHANNEL)
}

export const isDesktopMusicAction = (value: unknown): value is DesktopMusicAction =>
  value === 'music-start' || value === 'music-stop'

export const isDesktopMusicActionMessage = (value: unknown): value is DesktopMusicActionMessage => {
  if (typeof value !== 'object' || value === null || !('actionId' in value)) {
    return false
  }

  return isDesktopMusicAction(value.actionId)
}
