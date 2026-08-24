import {audioFetch, httpFetch} from '../http-client'

export interface PTrack {
  readonly artist: string
  readonly durationSeconds: number
  readonly id: string
  readonly source: string
  readonly title: string
}

export interface PAlbum {
  readonly description: string
  readonly icon: string
  readonly id: string
  readonly title: string
  readonly trackIds: readonly string[]
}

export interface PResolvedAlbum extends PAlbum {
  readonly tracks: readonly PTrack[]
}

interface PAlbumCollection {
  readonly albums: readonly PAlbum[]
  readonly version: number
}

interface PTrackCollection {
  readonly tracks: readonly PTrack[]
  readonly version: number
}

export const FOCUS_ROOM_ALBUMS_URL = '/audio/albums.json'
export const FOCUS_ROOM_PLAYLIST_URL = '/audio/playlist.json'
export const FOCUS_ROOM_TRACKS_URL = '/audio/tracks.json'

interface PPlaylist {
  readonly trackIds: readonly string[]
  readonly version: number
}

export interface LoadPTracksOptions {
  readonly playlistUrl?: string
  readonly signal?: AbortSignal
  readonly tracksUrl?: string
}

export interface LoadPAlbumsOptions {
  readonly albumsUrl?: string
  readonly signal?: AbortSignal
  readonly tracksUrl?: string
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

const hasUniqueIds = (ids: readonly string[]) => new Set(ids).size === ids.length

const isPAlbum = (value: unknown): value is PAlbum => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const album = value as Record<string, unknown>

  return (
    isString(album.description) &&
    isString(album.icon) &&
    isString(album.id) &&
    isString(album.title) &&
    Array.isArray(album.trackIds) &&
    album.trackIds.every(isString) &&
    hasUniqueIds(album.trackIds)
  )
}

const isPAlbumCollection = (value: unknown): value is PAlbumCollection => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const collection = value as Record<string, unknown>

  return (
    collection.version === 1 &&
    Array.isArray(collection.albums) &&
    collection.albums.every(isPAlbum) &&
    hasUniqueIds(collection.albums.map((album) => album.id))
  )
}

const isPTrackCollection = (value: unknown): value is PTrackCollection => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const collection = value as Record<string, unknown>

  return (
    collection.version === 1 &&
    Array.isArray(collection.tracks) &&
    collection.tracks.every(isPTrack) &&
    hasUniqueIds(collection.tracks.map((track) => track.id))
  )
}

const isPPlaylist = (value: unknown): value is PPlaylist => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const playlist = value as Record<string, unknown>

  return (
    playlist.version === 1 &&
    Array.isArray(playlist.trackIds) &&
    playlist.trackIds.every(isString) &&
    hasUniqueIds(playlist.trackIds)
  )
}

const resolveTrackIds = (
  trackIds: readonly string[],
  tracks: readonly PTrack[],
  invalidReferenceMessage: string,
) => {
  const tracksById = new Map(tracks.map((track) => [track.id, track]))
  return trackIds.map((trackId) => {
    const track = tracksById.get(trackId)

    if (track === undefined) {
      throw new TypeError(invalidReferenceMessage)
    }

    return track
  })
}

const createRequestInit = (signal?: AbortSignal): RequestInit => ({
  cache: import.meta.env.DEV ? 'no-store' : 'default',
  signal,
})

const fetchAudioJson = (
  defaultPath: string,
  overrideUrl: string | undefined,
  signal?: AbortSignal,
) =>
  overrideUrl === undefined
    ? audioFetch(defaultPath, createRequestInit(signal))
    : httpFetch(overrideUrl, createRequestInit(signal))

/** Loads and validates the bundled focus-room albums and their tracks. */
export const loadPAlbums = async (
  options: LoadPAlbumsOptions = {},
): Promise<readonly PResolvedAlbum[]> => {
  const [tracksResponse, albumsResponse] = await Promise.all([
    fetchAudioJson('tracks.json', options.tracksUrl, options.signal),
    fetchAudioJson('albums.json', options.albumsUrl, options.signal),
  ])

  if (!tracksResponse.ok) {
    throw new Error(`Focus-room tracks request failed: ${tracksResponse.status}`)
  }

  if (!albumsResponse.ok) {
    throw new Error(`Focus-room albums request failed: ${albumsResponse.status}`)
  }

  const [trackCollection, albumCollection]: readonly [unknown, unknown] = await Promise.all([
    tracksResponse.json(),
    albumsResponse.json(),
  ])

  if (!isPTrackCollection(trackCollection)) {
    throw new TypeError('Focus-room tracks have an invalid format')
  }

  if (!isPAlbumCollection(albumCollection)) {
    throw new TypeError('Focus-room albums have an invalid format')
  }

  return albumCollection.albums.map((album) => ({
    ...album,
    tracks: resolveTrackIds(
      album.trackIds,
      trackCollection.tracks,
      'Focus-room albums reference unknown tracks',
    ),
  }))
}

/** Loads and validates the bundled focus-room playlist. */
export const loadPTracks = async (options: LoadPTracksOptions = {}): Promise<readonly PTrack[]> => {
  const [tracksResponse, playlistResponse] = await Promise.all([
    fetchAudioJson('tracks.json', options.tracksUrl, options.signal),
    fetchAudioJson('playlist.json', options.playlistUrl, options.signal),
  ])

  if (!tracksResponse.ok) {
    throw new Error(`Focus-room tracks request failed: ${tracksResponse.status}`)
  }

  if (!playlistResponse.ok) {
    throw new Error(`Focus-room playlist request failed: ${playlistResponse.status}`)
  }

  const [collection, playlist]: readonly [unknown, unknown] = await Promise.all([
    tracksResponse.json(),
    playlistResponse.json(),
  ])

  if (!isPTrackCollection(collection)) {
    throw new TypeError('Focus-room tracks have an invalid format')
  }

  if (!isPPlaylist(playlist)) {
    throw new TypeError('Focus-room playlist has an invalid format')
  }

  return resolveTrackIds(
    playlist.trackIds,
    collection.tracks,
    'Focus-room playlist references unknown tracks',
  )
}
