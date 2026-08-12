export interface FocusRoomTrack {
  readonly artist: string
  readonly durationSeconds: number
  readonly id: string
  readonly source: string
  readonly title: string
}

interface FocusRoomPlaylist {
  readonly tracks: readonly FocusRoomTrack[]
  readonly version: number
}

export const FOCUS_ROOM_PLAYLIST_URL = '/data/focus-room-playlist.json'

const isString = (value: unknown): value is string => typeof value === 'string'

const isFocusRoomTrack = (value: unknown): value is FocusRoomTrack => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const track = value as Record<string, unknown>

  return (
    isString(track.artist) &&
    typeof track.durationSeconds === 'number' &&
    Number.isFinite(track.durationSeconds) &&
    track.durationSeconds > 0 &&
    isString(track.id) &&
    isString(track.source) &&
    isString(track.title)
  )
}

const isFocusRoomPlaylist = (value: unknown): value is FocusRoomPlaylist => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const playlist = value as Record<string, unknown>

  return (
    playlist.version === 1 &&
    Array.isArray(playlist.tracks) &&
    playlist.tracks.every(isFocusRoomTrack)
  )
}

/** Loads and validates the public focus-room playlist. */
export const loadFocusRoomTracks = async (
  playlistUrl = FOCUS_ROOM_PLAYLIST_URL,
): Promise<readonly FocusRoomTrack[]> => {
  const response = await fetch(playlistUrl)

  if (!response.ok) {
    throw new Error(`Focus-room playlist request failed: ${response.status}`)
  }

  const playlist: unknown = await response.json()

  if (!isFocusRoomPlaylist(playlist)) {
    throw new TypeError('Focus-room playlist has an invalid format')
  }

  return playlist.tracks
}
