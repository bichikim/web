import {and, asc, desc, eq, gt, inArray, isNull, lte, or} from 'drizzle-orm'

import {
  commerceEntitlementGrants,
  commerceOffers,
  commerceProductAlbums,
  commerceProducts,
  getDatabase,
  musicAlbums,
  musicAlbumTracks,
  musicAlbumTranslations,
  musicTrackAssets,
  musicTracks,
} from '../database'

export interface PublishedAlbumSaleConfigured {
  readonly externalProductId: string
  readonly state: 'configured'
}

export interface PublishedAlbumSalePreparing {
  readonly state: 'preparing'
}

export type PublishedAlbumSale = PublishedAlbumSaleConfigured | PublishedAlbumSalePreparing

export interface PublishedAlbumTrack {
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

export interface TrackAccessAsset {
  readonly assetId: string
  readonly durationMs: number
  readonly objectKey: string
}

export const findPublishedTrackPreviewAsset = async (
  trackId: string,
): Promise<TrackAccessAsset | null> => {
  const database = getDatabase()
  const [asset] = await database
    .select({
      assetId: musicTrackAssets.id,
      durationMs: musicTrackAssets.durationMs,
      objectKey: musicTrackAssets.objectKey,
    })
    .from(musicTrackAssets)
    .innerJoin(musicAlbumTracks, eq(musicAlbumTracks.trackId, musicTrackAssets.trackId))
    .innerJoin(musicAlbums, eq(musicAlbums.id, musicAlbumTracks.albumId))
    .where(
      and(
        eq(musicTrackAssets.trackId, trackId),
        eq(musicTrackAssets.status, 'active'),
        eq(musicAlbums.status, 'published'),
      ),
    )
    .limit(1)

  return asset?.durationMs === null || asset === undefined
    ? null
    : {assetId: asset.assetId, durationMs: asset.durationMs, objectKey: asset.objectKey}
}

export const findEntitledTrackPlaybackAsset = async (
  userId: string,
  trackId: string,
  now: Date = new Date(),
): Promise<TrackAccessAsset | null> => {
  const database = getDatabase()
  const [asset] = await database
    .select({
      assetId: musicTrackAssets.id,
      durationMs: musicTrackAssets.durationMs,
      objectKey: musicTrackAssets.objectKey,
    })
    .from(commerceEntitlementGrants)
    .innerJoin(
      commerceProductAlbums,
      eq(commerceProductAlbums.productId, commerceEntitlementGrants.productId),
    )
    .innerJoin(musicAlbumTracks, eq(musicAlbumTracks.albumId, commerceProductAlbums.albumId))
    .innerJoin(musicTrackAssets, eq(musicTrackAssets.trackId, musicAlbumTracks.trackId))
    .where(
      and(
        eq(commerceEntitlementGrants.userId, userId),
        eq(musicAlbumTracks.trackId, trackId),
        isNull(commerceEntitlementGrants.revokedAt),
        lte(commerceEntitlementGrants.startsAt, now),
        or(isNull(commerceEntitlementGrants.endsAt), gt(commerceEntitlementGrants.endsAt, now)),
        eq(musicTrackAssets.status, 'active'),
      ),
    )
    .limit(1)

  return asset?.durationMs === null || asset === undefined
    ? null
    : {assetId: asset.assetId, durationMs: asset.durationMs, objectKey: asset.objectKey}
}

export const listPublishedAlbums = async (
  locale: PublishedAlbumLocale = 'ko',
): Promise<ReadonlyArray<PublishedAlbum>> => {
  const database = getDatabase()
  const requestedLocales: ReadonlyArray<PublishedAlbumLocale> =
    locale === 'ko' ? ['ko'] : ['en', 'ko']
  const [albumTranslations, albumTracks, offers] = await Promise.all([
    database
      .select({
        coverFallback: musicAlbums.coverFallback,
        coverImageUrl: musicAlbums.coverImageUrl,
        description: musicAlbumTranslations.description,
        id: musicAlbums.id,
        locale: musicAlbumTranslations.locale,
        publishedAt: musicAlbums.publishedAt,
        title: musicAlbumTranslations.title,
      })
      .from(musicAlbums)
      .innerJoin(musicAlbumTranslations, eq(musicAlbumTranslations.albumId, musicAlbums.id))
      .where(
        and(
          eq(musicAlbums.status, 'published'),
          inArray(musicAlbumTranslations.locale, requestedLocales),
        ),
      )
      .orderBy(desc(musicAlbums.publishedAt)),
    database
      .select({
        albumId: musicAlbumTracks.albumId,
        artist: musicTracks.artist,
        id: musicTracks.id,
        title: musicTracks.title,
      })
      .from(musicAlbumTracks)
      .innerJoin(musicAlbums, eq(musicAlbumTracks.albumId, musicAlbums.id))
      .innerJoin(musicTracks, eq(musicAlbumTracks.trackId, musicTracks.id))
      .innerJoin(musicTrackAssets, eq(musicTrackAssets.trackId, musicAlbumTracks.trackId))
      .where(and(eq(musicAlbums.status, 'published'), eq(musicTrackAssets.status, 'active')))
      .orderBy(asc(musicAlbumTracks.albumId), asc(musicAlbumTracks.position)),
    database
      .select({
        albumId: commerceProductAlbums.albumId,
        externalProductId: commerceOffers.externalProductId,
      })
      .from(commerceProductAlbums)
      .innerJoin(commerceProducts, eq(commerceProductAlbums.productId, commerceProducts.id))
      .innerJoin(commerceOffers, eq(commerceOffers.productId, commerceProducts.id))
      .innerJoin(musicAlbums, eq(commerceProductAlbums.albumId, musicAlbums.id))
      .where(
        and(
          eq(musicAlbums.status, 'published'),
          eq(commerceProducts.status, 'active'),
          eq(commerceOffers.billingType, 'one_time'),
          eq(commerceOffers.provider, 'apps-in-toss'),
          eq(commerceOffers.status, 'active'),
        ),
      ),
  ])
  const tracksByAlbum = new Map<string, PublishedAlbumTrack[]>()
  const offersByAlbum = new Map(offers.map((offer) => [offer.albumId, offer.externalProductId]))
  const albumsById: Map<string, (typeof albumTranslations)[number]> = new Map()

  for (const translation of albumTranslations) {
    const current = albumsById.get(translation.id)

    if (current === undefined || translation.locale === locale) {
      albumsById.set(translation.id, translation)
    }
  }

  for (const track of albumTracks) {
    const tracks = tracksByAlbum.get(track.albumId) ?? []
    tracks.push({artist: track.artist, id: track.id, title: track.title})
    tracksByAlbum.set(track.albumId, tracks)
  }

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
