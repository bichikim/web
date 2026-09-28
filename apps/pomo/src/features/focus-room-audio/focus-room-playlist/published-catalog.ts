import {createCatalogRequestInit, hasUniqueIds} from 'src/features/catalog-policy'
import * as m from '@paraglide/message'

import {isPaymentProvider} from 'src/features/payment/types'

import {apiFetch, httpFetch} from '../../http-client'
import type {
  LoadPublishedPAlbumsOptions,
  PAlbumOffer,
  PPublishedAlbumCatalog,
  PTrackListing,
} from './model'

const MAXIMUM_FRACTIONAL_DIGITS = 6

interface PublishedAlbumCollection {
  readonly albums: ReadonlyArray<PublishedAlbum>
  readonly version: number
}

interface PublishedAlbum {
  readonly coverFallback: 'cd' | 'lp' | 'music'
  readonly coverImageUrl: string | null
  readonly description: string
  readonly id: string
  readonly offers?: ReadonlyArray<PAlbumOffer>
  readonly productId?: string
  readonly sale:
    | {readonly externalProductId: string; readonly state: 'configured'}
    | {readonly state: 'preparing'}
  readonly title: string
  readonly trackCount: number
  readonly tracks: ReadonlyArray<PTrackListing>
}

const isString = (value: unknown): value is string => typeof value === 'string'

const isNonNegativeIntegerString = (value: unknown): value is string =>
  isString(value) && /^(?:0|[1-9]\d*)$/u.test(value)

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

const isPublishedAlbumOffer = (value: unknown): value is PAlbumOffer => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const offer = value as Record<string, unknown>
  if (
    !isString(offer.externalProductId) ||
    !isString(offer.productId) ||
    !isPaymentProvider(offer.provider)
  ) {
    return false
  }

  if (offer.provider === 'apps-in-toss') {
    return offer.amountMinor === null && offer.currency === null && offer.fractionalDigits === null
  }

  return (
    isNonNegativeIntegerString(offer.amountMinor) &&
    isString(offer.currency) &&
    /^[A-Z]{3}$/u.test(offer.currency) &&
    Number.isInteger(offer.fractionalDigits) &&
    Number(offer.fractionalDigits) >= 0 &&
    Number(offer.fractionalDigits) <= MAXIMUM_FRACTIONAL_DIGITS
  )
}

const isPublishedAlbumSale = (value: unknown): boolean => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const sale = value as Record<string, unknown>
  return (
    sale.state === 'preparing' || (sale.state === 'configured' && isString(sale.externalProductId))
  )
}

const isPublishedAlbumPaymentCatalog = (album: Record<string, unknown>): boolean => {
  const {offers, productId} = album

  if (productId !== undefined && !isString(productId)) {
    return false
  }

  if (offers === undefined) {
    return true
  }

  return (
    Array.isArray(offers) &&
    offers.every(isPublishedAlbumOffer) &&
    (offers.length === 0 || isString(productId))
  )
}

const isPublishedAlbum = (value: unknown): value is PublishedAlbum => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const album = value as Record<string, unknown>

  return (
    (album.coverFallback === 'cd' ||
      album.coverFallback === 'lp' ||
      album.coverFallback === 'music') &&
    (album.coverImageUrl === null || isString(album.coverImageUrl)) &&
    isString(album.description) &&
    isString(album.id) &&
    isPublishedAlbumPaymentCatalog(album) &&
    isPublishedAlbumSale(album.sale) &&
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
        ? await apiFetch(localizedAlbumsUrl, createCatalogRequestInit(options.signal))
        : await httpFetch(localizedAlbumsUrl, createCatalogRequestInit(options.signal))

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
        ...(album.offers === undefined ? {} : {offers: album.offers}),
        ...(album.productId === undefined ? {} : {productId: album.productId}),
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
