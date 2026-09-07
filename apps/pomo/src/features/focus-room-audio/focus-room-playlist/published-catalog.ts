import * as m from '@paraglide/message'

import {apiFetch, httpFetch} from '../../http-client'
import type {LoadPublishedPAlbumsOptions, PPublishedAlbumCatalog, PTrackListing} from './model'

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

const isString = (value: unknown): value is string => typeof value === 'string'

const hasUniqueIds = (ids: readonly string[]) => new Set(ids).size === ids.length

const isTrackListing = (value: unknown): value is PTrackListing => {
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

const hasPublishedTracks = (album: Record<string, unknown>): boolean => {
  const {tracks} = album

  return (
    Array.isArray(tracks) &&
    tracks.every(isTrackListing) &&
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

const createRequestInit = (signal?: AbortSignal): RequestInit => ({
  /* v8 ignore next -- Vitest compiles import.meta.env.DEV as one fixed execution mode. */
  cache: import.meta.env.DEV ? 'no-store' : 'default',
  signal,
})

const getCoverIcon = (fallback: PublishedAlbum['coverFallback']): string => {
  switch (fallback) {
    case 'cd':
      return 'i-tabler-disc'
    case 'lp':
      return 'i-tabler-vinyl'
    case 'music':
      return 'i-tabler-music'
  }
}

/** Loads and validates the public focus-room album catalog without discarding failure state. */
export const loadPublishedPAlbums = async (
  options: LoadPublishedPAlbumsOptions = {},
): Promise<PPublishedAlbumCatalog> => {
  try {
    const albumsUrl = options.publishedAlbumsUrl ?? 'music/albums'
    const localizedAlbumsUrl =
      options.locale === undefined
        ? albumsUrl
        : `${albumsUrl}${albumsUrl.includes('?') ? '&' : '?'}locale=${encodeURIComponent(options.locale)}`
    const response =
      options.publishedAlbumsUrl === undefined
        ? await apiFetch(localizedAlbumsUrl, createRequestInit(options.signal))
        : await httpFetch(localizedAlbumsUrl, createRequestInit(options.signal))

    if (!response.ok) {
      throw new Error(`Published focus-room albums request failed: ${response.status}`)
    }

    const collection: unknown = await response.json()

    if (!isPublishedAlbumCollection(collection)) {
      throw new TypeError('Published focus-room albums have an invalid format')
    }

    return {
      albums: collection.albums.map((album) => ({
        coverImageUrl: album.coverImageUrl ?? undefined,
        description: album.description,
        icon: getCoverIcon(album.coverFallback),
        id: album.id,
        sale:
          album.sale.state === 'preparing'
            ? {
                state: 'preparing',
                statusLabel: m.album_sale_preparing({}, {locale: options.locale}),
              }
            : {
                priceLabel: m.album_sale_price_pending({}, {locale: options.locale}),
                state: 'configured',
                statusLabel: m.album_sale_connected({}, {locale: options.locale}),
              },
        title: album.title,
        trackCount: album.trackCount,
        trackIds: [],
        trackListings: album.tracks,
        tracks: [],
      })),
      status: 'ready',
    }
  } catch (error: unknown) {
    if (options.signal?.aborted === true) {
      throw error
    }

    return {
      error:
        error instanceof Error
          ? error
          : new Error('Published focus-room albums request failed', {cause: error}),
      status: 'failed',
    }
  }
}
