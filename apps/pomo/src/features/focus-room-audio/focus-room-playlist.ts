import {audioFetch, httpFetch} from '../http-client'
import * as m from '@paraglide/message'
import type {Locale} from '@paraglide/runtime'

import type {
  LoadBundledPAlbumsOptions,
  LoadPAlbumsOptions,
  LoadPTracksOptions,
  PAlbum,
  PAlbumLibrary,
  PResolvedAlbum,
  PTrack,
  PTrackQueueSource,
} from './focus-room-playlist/model'
import {loadPTrackCatalog} from './focus-room-playlist/catalog'
import {loadPublishedPAlbums} from './focus-room-playlist/published-catalog'

export type * from './focus-room-playlist/model'
export {loadPTrackCatalog} from './focus-room-playlist/catalog'
export {loadPublishedPAlbums} from './focus-room-playlist/published-catalog'

interface PAlbumCollection {
  readonly albums: readonly PAlbum[]
  readonly version: number
}

export const FOCUS_ROOM_ALBUMS_URL = '/audio/albums.json'
export const PUBLISHED_ALBUMS_URL = '/api/music/albums'
export const FOCUS_ROOM_PLAYLIST_URL = '/audio/playlist.json'
export const FOCUS_ROOM_TRACKS_URL = '/audio/tracks.json'

interface PPlaylist {
  readonly trackIds: readonly string[]
  readonly version: number
}

const isString = (value: unknown): value is string => typeof value === 'string'

const hasUniqueIds = (ids: readonly string[]) => new Set(ids).size === ids.length

const isPAlbum = (value: unknown): value is PAlbum => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const album = value as Record<string, unknown>

  return (
    (album.coverImageUrl === undefined || isString(album.coverImageUrl)) &&
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

const resolveAlbumTracks = (album: PAlbum, tracks: readonly PTrack[]): readonly PTrack[] =>
  resolveTrackIds(album.trackIds, tracks, 'Focus-room albums reference unknown tracks').map(
    (track) =>
      track.artworkUrl !== undefined || album.coverImageUrl === undefined
        ? track
        : {...track, artworkUrl: album.coverImageUrl},
  )

const createRequestInit = (signal?: AbortSignal): RequestInit => ({
  cache: import.meta.env.DEV ? 'no-store' : 'default',
  signal,
})

const localizeBundledAlbum = (album: PAlbum, locale: Locale | undefined): PAlbum => {
  const options = {locale}

  switch (album.id) {
    case 'morning-focus':
      return {
        ...album,
        description: m.album_morning_focus_description({}, options),
        title: m.album_morning_focus_title({}, options),
      }
    case 'cafe-focus':
      return {
        ...album,
        description: m.album_cafe_focus_description({}, options),
        title: m.album_cafe_focus_title({}, options),
      }
    case 'tension-focus':
      return {
        ...album,
        description: m.album_tension_focus_description({}, options),
        title: m.album_tension_focus_title({}, options),
      }
    case 'happy-detour':
      return {
        ...album,
        description: m.album_happy_detour_description({}, options),
        title: m.album_happy_detour_title({}, options),
      }
    case 'quiet-pages':
      return {
        ...album,
        description: m.album_quiet_pages_description({}, options),
        title: m.album_quiet_pages_title({}, options),
      }
    default:
      return album
  }
}

const fetchAudioJson = (
  defaultPath: string,
  overrideUrl: string | undefined,
  signal?: AbortSignal,
) =>
  overrideUrl === undefined
    ? audioFetch(defaultPath, createRequestInit(signal))
    : httpFetch(overrideUrl, createRequestInit(signal))

/** Loads and validates the bundled focus-room albums and their tracks. */
export const loadBundledPAlbums = async (
  options: LoadBundledPAlbumsOptions = {},
): Promise<readonly PResolvedAlbum[]> => {
  const [tracks, albumsResponse] = await Promise.all([
    loadPTrackCatalog({signal: options.signal, tracksUrl: options.tracksUrl}),
    fetchAudioJson('albums.json', options.albumsUrl, options.signal),
  ])

  if (!albumsResponse.ok) {
    throw new Error(`Focus-room albums request failed: ${albumsResponse.status}`)
  }

  const albumCollection: unknown = await albumsResponse.json()

  if (!isPAlbumCollection(albumCollection)) {
    throw new TypeError('Focus-room albums have an invalid format')
  }

  const bundledAlbums = albumCollection.albums.map((album) => ({
    ...localizeBundledAlbum(album, options.locale),
    tracks: resolveAlbumTracks(album, tracks),
  }))
  return bundledAlbums
}

/** Loads the bundled and public focus-room album catalogs with independent public status. */
export const loadPAlbums = async (options: LoadPAlbumsOptions = {}): Promise<PAlbumLibrary> => {
  const bundledAlbums = await loadBundledPAlbums(options)
  const publishedCatalog = await loadPublishedPAlbums(options)

  return {bundledAlbums, publishedCatalog}
}

/** Loads and validates the complete track catalog and bundled default playlist. */
export const loadPTrackQueueSource = async (
  options: LoadPTracksOptions = {},
): Promise<PTrackQueueSource> => {
  const [tracks, playlistResponse] = await Promise.all([
    loadPTrackCatalog({signal: options.signal, tracksUrl: options.tracksUrl}),
    fetchAudioJson('playlist.json', options.playlistUrl, options.signal),
  ])

  if (!playlistResponse.ok) {
    throw new Error(`Focus-room playlist request failed: ${playlistResponse.status}`)
  }

  const playlist: unknown = await playlistResponse.json()

  if (!isPPlaylist(playlist)) {
    throw new TypeError('Focus-room playlist has an invalid format')
  }

  return {
    defaultTracks: resolveTrackIds(
      playlist.trackIds,
      tracks,
      'Focus-room playlist references unknown tracks',
    ),
    tracks,
  }
}

/** Loads and validates the bundled focus-room playlist. */
export const loadPTracks = async (options: LoadPTracksOptions = {}): Promise<readonly PTrack[]> =>
  (await loadPTrackQueueSource(options)).defaultTracks
