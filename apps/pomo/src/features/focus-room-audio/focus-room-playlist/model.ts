import type {Locale} from '@paraglide/runtime'

export interface PTrack {
  readonly artworkUrl?: string
  readonly artist: string
  readonly durationSeconds: number
  readonly id: string
  readonly source: PTrackSource
  readonly title: string
}

export interface PPublicTrackSource {
  readonly kind: 'public'
  readonly url: string
}

export interface PEntitledTrackSource {
  readonly kind: 'entitled'
  readonly trackId: string
}

/** Supports the legacy v1 JSON source while owned tracks use an access-aware source. */
export type PTrackSource = PEntitledTrackSource | PPublicTrackSource | string

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
  readonly offers?: readonly PAlbumOffer[]
  readonly owned?: boolean
  readonly productId?: string
  readonly sale?: PAlbumSale
  readonly title: string
  readonly trackCount?: number
  readonly trackIds: readonly string[]
  readonly trackListings?: readonly PTrackListing[]
}

export interface PAlbumOfferBase {
  readonly externalProductId: string
  readonly productId: string
}

export interface PAppsInTossAlbumOffer extends PAlbumOfferBase {
  readonly amountMinor: null
  readonly currency: null
  readonly fractionalDigits: null
  readonly provider: 'apps-in-toss'
}

export interface PPaddleAlbumOffer extends PAlbumOfferBase {
  readonly amountMinor: string
  readonly currency: string
  readonly fractionalDigits: number
  readonly provider: 'paddle'
}

export type PAlbumOffer = PAppsInTossAlbumOffer | PPaddleAlbumOffer

export interface PAlbumSale {
  readonly priceLabel?: string
  readonly state: 'configured' | 'preparing'
  readonly statusLabel: string
}

export interface PResolvedAlbum extends PAlbum {
  readonly tracks: readonly PTrack[]
}

export interface PPublishedAlbumCatalogFailed {
  readonly error: Error
  readonly status: 'failed'
}

export interface PPublishedAlbumCatalogReady {
  readonly albums: readonly PResolvedAlbum[]
  readonly status: 'ready'
}

export type PPublishedAlbumCatalog = PPublishedAlbumCatalogFailed | PPublishedAlbumCatalogReady

export interface PAlbumLibrary {
  readonly bundledAlbums: readonly PResolvedAlbum[]
  readonly publishedCatalog: PPublishedAlbumCatalog
}

export interface LoadPTrackCatalogOptions {
  readonly signal?: AbortSignal
  readonly tracksUrl?: string
}

export interface LoadPTracksOptions extends LoadPTrackCatalogOptions {
  readonly ownedAlbumsUrl?: string
  readonly playlistUrl?: string
}

export interface PTrackQueueSource {
  readonly defaultTracks: readonly PTrack[]
  readonly tracks: readonly PTrack[]
}

export interface LoadBundledPAlbumsOptions {
  readonly albumsUrl?: string
  readonly locale?: Locale
  readonly signal?: AbortSignal
  readonly tracksUrl?: string
}

export interface LoadPublishedPAlbumsOptions {
  readonly locale?: Locale
  readonly publishedAlbumsUrl?: string
  readonly signal?: AbortSignal
}

export interface LoadOwnedPAlbumsOptions {
  readonly locale?: Locale
  readonly ownedAlbumsUrl?: string
  readonly signal?: AbortSignal
}

export interface LoadPAlbumsOptions
  extends LoadBundledPAlbumsOptions, LoadPublishedPAlbumsOptions {}
