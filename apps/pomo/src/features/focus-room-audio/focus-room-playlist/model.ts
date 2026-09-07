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

export interface LoadPTracksOptions {
  readonly playlistUrl?: string
  readonly signal?: AbortSignal
  readonly tracksUrl?: string
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

export interface LoadPAlbumsOptions
  extends LoadBundledPAlbumsOptions, LoadPublishedPAlbumsOptions {}
