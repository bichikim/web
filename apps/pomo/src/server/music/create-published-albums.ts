import {mapValues} from 'es-toolkit/map'

export interface PublishedAlbumSaleConfigured {
  readonly externalProductId: string
  readonly state: 'configured'
}

export interface PublishedAlbumSalePreparing {
  readonly state: 'preparing'
}

export type PublishedAlbumSale = PublishedAlbumSaleConfigured | PublishedAlbumSalePreparing

export interface PublishedAlbumTrack {
  readonly artworkUrl?: string
  readonly artist: string
  readonly id: string
  readonly title: string
}

export interface PublishedAlbum {
  readonly coverFallback: 'cd' | 'lp' | 'music'
  readonly coverImageUrl: string | null
  readonly description: string
  readonly id: string
  readonly sale: PublishedAlbumSale
  readonly title: string
  readonly trackCount: number
  readonly tracks: ReadonlyArray<PublishedAlbumTrack>
}

export type PublishedAlbumLocale = 'en' | 'ko'

export interface AlbumTranslation {
  readonly coverFallback: PublishedAlbum['coverFallback']
  readonly coverImageUrl: string | null
  readonly description: string
  readonly id: string
  readonly locale: string
  readonly title: string
}

export interface AlbumTrack {
  readonly albumId: string
  readonly artist: string
  readonly artworkUrl: string | null
  readonly id: string
  readonly title: string
}

export interface AlbumOffer {
  readonly albumId: string
  readonly externalProductId: string
}

export interface CreatePublishedAlbumsOptions {
  readonly albumTranslations: ReadonlyArray<AlbumTranslation>
  readonly albumTracks: ReadonlyArray<AlbumTrack>
  readonly offers: ReadonlyArray<AlbumOffer>
  readonly locale: PublishedAlbumLocale
}

/** Assembles the public catalog from completed query snapshots in their original order. */
export const createPublishedAlbums = (
  options: CreatePublishedAlbumsOptions,
): ReadonlyArray<PublishedAlbum> => {
  const {albumTranslations, albumTracks, offers, locale} = options
  const tracksByAlbum = mapValues(
    Map.groupBy(albumTracks, (track) => track.albumId),
    (tracks): PublishedAlbumTrack[] =>
      tracks.map((track) => ({
        artist: track.artist,
        artworkUrl: track.artworkUrl ?? undefined,
        id: track.id,
        title: track.title,
      })),
  )
  const offersByAlbum = new Map(offers.map((offer) => [offer.albumId, offer.externalProductId]))
  const albumsById = mapValues(
    Map.groupBy(albumTranslations, (translation) => translation.id),
    // Keep publication order while choosing the last requested-locale row or first fallback.
    (translations) =>
      translations.findLast((translation) => translation.locale === locale) ?? translations[0],
  )

  return [...albumsById.values()].map((album) => {
    const externalProductId = offersByAlbum.get(album.id)
    const sale: PublishedAlbumSale =
      externalProductId === undefined
        ? {state: 'preparing'}
        : {externalProductId, state: 'configured'}

    const tracks = tracksByAlbum.get(album.id) ?? []
    return {
      coverFallback: album.coverFallback,
      coverImageUrl: album.coverImageUrl,
      description: album.description,
      id: album.id,
      sale,
      title: album.title,
      trackCount: tracks.length,
      tracks,
    }
  })
}
