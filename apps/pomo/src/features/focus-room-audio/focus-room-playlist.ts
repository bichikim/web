import {apiFetch, audioFetch, httpFetch} from '../http-client'
import * as m from '@paraglide/message'
import type {Locale} from '@paraglide/runtime'

export interface PTrack {
  readonly artworkUrl?: string
  readonly artist: string
  readonly durationSeconds: number
  readonly id: string
  readonly source: string
  readonly title: string
}

export interface PTrackListing {
  readonly artworkUrl?: string
  readonly artist: string
  readonly id: string
  readonly title: string
}

export interface PAlbum {
  readonly coverImageUrl?: string
  readonly description: string
  readonly icon: string
  readonly id: string
  readonly sale?: PAlbumSale
  readonly title: string
  readonly trackCount?: number
  readonly trackIds: readonly string[]
  readonly trackListings?: readonly PTrackListing[]
}

export interface PAlbumSale {
  readonly priceLabel?: string
  readonly state: 'configured' | 'preparing'
  readonly statusLabel: string
}

export interface PResolvedAlbum extends PAlbum {
  readonly tracks: readonly PTrack[]
}

interface PAlbumCollection {
  readonly albums: readonly PAlbum[]
  readonly version: number
}

interface PublishedAlbumCollection {
  readonly albums: ReadonlyArray<PublishedAlbum>
  readonly version: number
}

interface PublishedAlbum {
  readonly coverFallback: 'cd' | 'lp' | 'music'
  readonly coverImageUrl: string | null
  readonly description: string
  readonly id: string
  readonly sale:
    | {readonly externalProductId: string; readonly state: 'configured'}
    | {readonly state: 'preparing'}
  readonly title: string
  readonly trackCount: number
  readonly tracks: ReadonlyArray<PTrackListing>
}

interface PTrackCollection {
  readonly tracks: readonly PTrack[]
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

export interface LoadPTracksOptions {
  readonly playlistUrl?: string
  readonly signal?: AbortSignal
  readonly tracksUrl?: string
}

export interface LoadPAlbumsOptions {
  readonly albumsUrl?: string
  readonly locale?: Locale
  readonly publishedAlbumsUrl?: string
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
    (track.artworkUrl === undefined || isString(track.artworkUrl)) &&
    isString(track.artist) &&
    typeof track.durationSeconds === 'number' &&
    Number.isFinite(track.durationSeconds) &&
    track.durationSeconds > 0 &&
    isString(track.id) &&
    isString(track.source) &&
    isString(track.title)
  )
}

const isPTrackListing = (value: unknown): value is PTrackListing => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const track = value as Record<string, unknown>
  return (
    (track.artworkUrl === undefined || isString(track.artworkUrl)) &&
    isString(track.artist) &&
    isString(track.id) &&
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

const hasPublishedTracks = (album: Record<string, unknown>): boolean => {
  const {tracks} = album

  return (
    Array.isArray(tracks) &&
    tracks.every(isPTrackListing) &&
    hasUniqueIds(tracks.map((track) => track.id)) &&
    album.trackCount === tracks.length
  )
}

const isPublishedAlbum = (value: unknown): value is PublishedAlbum => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const album = value as Record<string, unknown>
  const {sale} = album

  if (typeof sale !== 'object' || sale === null) {
    return false
  }

  const saleRecord = sale as Record<string, unknown>
  const hasValidSale =
    saleRecord.state === 'preparing' ||
    (saleRecord.state === 'configured' && isString(saleRecord.externalProductId))

  return (
    (album.coverFallback === 'cd' ||
      album.coverFallback === 'lp' ||
      album.coverFallback === 'music') &&
    (album.coverImageUrl === null || isString(album.coverImageUrl)) &&
    isString(album.description) &&
    isString(album.id) &&
    hasValidSale &&
    isString(album.title) &&
    Number.isInteger(album.trackCount) &&
    Number(album.trackCount) >= 0 &&
    hasPublishedTracks(album)
  )
}

const isPublishedAlbumCollection = (value: unknown): value is PublishedAlbumCollection => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const collection = value as Record<string, unknown>

  return (
    collection.version === 1 &&
    Array.isArray(collection.albums) &&
    collection.albums.every(isPublishedAlbum) &&
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

const getCoverIcon = (fallback: PublishedAlbum['coverFallback']): string => {
  if (fallback === 'cd') {
    return 'i-tabler-disc'
  }

  return fallback === 'music' ? 'i-tabler-music' : 'i-tabler-vinyl'
}

const loadPublishedAlbums = async (
  overrideUrl: string | undefined,
  locale: Locale | undefined,
  signal?: AbortSignal,
): Promise<ReadonlyArray<PResolvedAlbum>> => {
  try {
    const albumsUrl = overrideUrl ?? 'music/albums'
    const localizedAlbumsUrl =
      locale === undefined
        ? albumsUrl
        : `${albumsUrl}${albumsUrl.includes('?') ? '&' : '?'}locale=${encodeURIComponent(locale)}`
    const response =
      overrideUrl === undefined
        ? await apiFetch(localizedAlbumsUrl, createRequestInit(signal))
        : await httpFetch(localizedAlbumsUrl, createRequestInit(signal))

    const collection: unknown = response.ok ? await response.json() : null

    if (!isPublishedAlbumCollection(collection)) {
      return []
    }

    return collection.albums.map((album) => ({
      coverImageUrl: album.coverImageUrl ?? undefined,
      description: album.description,
      icon: getCoverIcon(album.coverFallback),
      id: album.id,
      sale:
        album.sale.state === 'preparing'
          ? {state: 'preparing', statusLabel: m.album_sale_preparing({}, {locale})}
          : {
              priceLabel: m.album_sale_price_pending({}, {locale}),
              state: 'configured',
              statusLabel: m.album_sale_connected({}, {locale}),
            },
      title: album.title,
      trackCount: album.trackCount,
      trackIds: [],
      trackListings: album.tracks,
      tracks: [],
    }))
  } catch {
    return []
  }
}

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

  const bundledAlbums = albumCollection.albums.map((album) => ({
    ...localizeBundledAlbum(album, options.locale),
    tracks: resolveAlbumTracks(album, trackCollection.tracks),
  }))
  const publishedAlbums = await loadPublishedAlbums(
    options.publishedAlbumsUrl,
    options.locale,
    options.signal,
  )

  return [...bundledAlbums, ...publishedAlbums]
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
