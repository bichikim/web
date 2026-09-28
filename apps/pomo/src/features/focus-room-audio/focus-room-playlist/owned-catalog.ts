import {apiFetch, httpFetch} from '../../http-client'
import {readStoredAppSession} from '../../user-auth/app-session'
import type {LoadOwnedPAlbumsOptions, PResolvedAlbum, PTrackListing} from './model'

interface OwnedAlbumCollection {
  readonly albums: ReadonlyArray<OwnedAlbum>
  readonly version: number
}

interface OwnedAlbum {
  readonly coverFallback: 'cd' | 'lp' | 'music'
  readonly coverImageUrl: string | null
  readonly description: string
  readonly id: string
  readonly productId: string
  readonly title: string
  readonly trackCount: number
  readonly tracks: ReadonlyArray<OwnedTrack>
}

interface OwnedTrack extends PTrackListing {
  readonly durationSeconds: number
}

const HTTP_UNAUTHORIZED = 401

const isString = (value: unknown): value is string => typeof value === 'string'

const isOwnedTrack = (value: unknown): value is OwnedTrack => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const track = value as Record<string, unknown>
  return (
    (track.artworkUrl === undefined || isString(track.artworkUrl)) &&
    isString(track.artist) &&
    typeof track.durationSeconds === 'number' &&
    Number.isFinite(track.durationSeconds) &&
    Number(track.durationSeconds) > 0 &&
    isString(track.id) &&
    isString(track.title)
  )
}

const hasUniqueIds = (ids: readonly string[]) => new Set(ids).size === ids.length

const isOwnedAlbum = (value: unknown): value is OwnedAlbum => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const {coverFallback, coverImageUrl, description, id, productId, title, trackCount, tracks} =
    value as Record<string, unknown>

  return (
    (coverFallback === 'cd' || coverFallback === 'lp' || coverFallback === 'music') &&
    (coverImageUrl === null || isString(coverImageUrl)) &&
    isString(description) &&
    isString(id) &&
    isString(productId) &&
    isString(title) &&
    Number.isInteger(trackCount) &&
    Number(trackCount) >= 0 &&
    Array.isArray(tracks) &&
    tracks.every(isOwnedTrack) &&
    trackCount === tracks.length &&
    hasUniqueIds(tracks.map((track) => track.id))
  )
}

const isOwnedAlbumCollection = (value: unknown): value is OwnedAlbumCollection => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const collection = value as Record<string, unknown>
  return (
    collection.version === 1 &&
    Array.isArray(collection.albums) &&
    collection.albums.every(isOwnedAlbum) &&
    hasUniqueIds(collection.albums.map((album) => album.id))
  )
}

const getCoverIcon = (fallback: OwnedAlbum['coverFallback']): string => {
  switch (fallback) {
    case 'cd':
      return 'i-tabler-disc'
    case 'lp':
      return 'i-tabler-vinyl'
    case 'music':
      return 'i-tabler-music'
  }
}

const getOptionalAuthorizationHeaders = async (): Promise<HeadersInit | undefined> => {
  try {
    const token = await readStoredAppSession()
    return token === null ? undefined : {Authorization: `Bearer ${token}`}
  } catch {
    return undefined
  }
}

const createRequestInit = async (signal?: AbortSignal): Promise<RequestInit> => ({
  cache: 'no-store',
  credentials: 'include',
  headers: await getOptionalAuthorizationHeaders(),
  signal,
})

const resolveOwnedAlbum = (album: OwnedAlbum): PResolvedAlbum => ({
  coverImageUrl: album.coverImageUrl ?? undefined,
  description: album.description,
  icon: getCoverIcon(album.coverFallback),
  id: album.id,
  owned: true,
  productId: album.productId,
  title: album.title,
  trackCount: album.trackCount,
  trackIds: album.tracks.map((track) => track.id),
  trackListings: album.tracks.map((track) => ({
    artist: track.artist,
    ...(track.artworkUrl === undefined ? {} : {artworkUrl: track.artworkUrl}),
    id: track.id,
    title: track.title,
  })),
  tracks: album.tracks.map((track) => ({
    artist: track.artist,
    ...(track.artworkUrl === undefined ? {} : {artworkUrl: track.artworkUrl}),
    durationSeconds: track.durationSeconds,
    id: track.id,
    source: {kind: 'entitled', trackId: track.id},
    title: track.title,
  })),
})

/** Loads the authenticated user's owned albums without exposing another user's catalog. */
export const loadOwnedPAlbums = async (
  options: LoadOwnedPAlbumsOptions = {},
): Promise<readonly PResolvedAlbum[]> => {
  const albumsUrl = options.ownedAlbumsUrl ?? 'music/albums/owned'
  const localizedAlbumsUrl =
    options.locale === undefined
      ? albumsUrl
      : `${albumsUrl}${albumsUrl.includes('?') ? '&' : '?'}locale=${encodeURIComponent(options.locale)}`
  const requestInit = await createRequestInit(options.signal)
  const response =
    options.ownedAlbumsUrl === undefined
      ? await apiFetch(localizedAlbumsUrl, requestInit)
      : await httpFetch(localizedAlbumsUrl, requestInit)

  if (response.status === HTTP_UNAUTHORIZED) {
    return []
  }

  if (!response.ok) {
    throw new Error(`Owned focus-room albums request failed: ${response.status}`)
  }

  const collection: unknown = await response.json()

  if (!isOwnedAlbumCollection(collection)) {
    throw new TypeError('Owned focus-room albums have an invalid format')
  }

  return collection.albums.map(resolveOwnedAlbum)
}
