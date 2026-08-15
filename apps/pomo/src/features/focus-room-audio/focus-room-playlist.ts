export interface PTrack {
  readonly artist: string
  readonly durationSeconds: number
  readonly id: string
  readonly source: string
  readonly title: string
}

interface PPlaylist {
  readonly tracks: readonly PTrack[]
  readonly version: number
}

export const FOCUS_ROOM_PLAYLIST_URL = '/data/focus-room-playlist.json'

export interface LoadPTracksOptions {
  readonly playlistUrl?: string
  readonly signal?: AbortSignal
}

const isString = (value: unknown): value is string => typeof value === 'string'

const isPTrack = (value: unknown): value is PTrack => {
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

const isPPlaylist = (value: unknown): value is PPlaylist => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const playlist = value as Record<string, unknown>

  return playlist.version === 1 && Array.isArray(playlist.tracks) && playlist.tracks.every(isPTrack)
}

/** Loads and validates the public focus-room playlist. */
export const loadPTracks = async (options: LoadPTracksOptions = {}): Promise<readonly PTrack[]> => {
  const response = await fetch(options.playlistUrl ?? FOCUS_ROOM_PLAYLIST_URL, {
    signal: options.signal,
  })

  if (!response.ok) {
    throw new Error(`Focus-room playlist request failed: ${response.status}`)
  }

  const playlist: unknown = await response.json()

  if (!isPPlaylist(playlist)) {
    throw new TypeError('Focus-room playlist has an invalid format')
  }

  return playlist.tracks
}
