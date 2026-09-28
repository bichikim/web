import {and, asc, desc, eq, gt, inArray, isNull, lte, or} from 'drizzle-orm'

import {isPaymentProvider, type PaymentProvider} from 'src/features/payment/types'

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
} from '../../database'

const MILLISECONDS_PER_SECOND = 1000

export interface PublishedAlbumSaleConfigured {
  readonly externalProductId: string
  readonly state: 'configured'
}

export interface PublishedAlbumSalePreparing {
  readonly state: 'preparing'
}

export type PublishedAlbumSale = PublishedAlbumSaleConfigured | PublishedAlbumSalePreparing

export interface PublishedAlbumOffer {
  readonly amountMinor: string | null
  readonly currency: string | null
  readonly externalProductId: string
  readonly fractionalDigits: number | null
  readonly productId: string
  readonly provider: PaymentProvider
}

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
  readonly offers?: ReadonlyArray<PublishedAlbumOffer>
  readonly productId?: string
  readonly sale: PublishedAlbumSale
  readonly title: string
  readonly trackCount: number
  readonly tracks: ReadonlyArray<PublishedAlbumTrack>
}

export interface OwnedAlbumTrack extends PublishedAlbumTrack {
  readonly durationSeconds: number
}

export interface OwnedAlbum {
  readonly coverFallback: 'cd' | 'lp' | 'music'
  readonly coverImageUrl: string | null
  readonly description: string
  readonly id: string
  readonly productId: string
  readonly title: string
  readonly trackCount: number
  readonly tracks: ReadonlyArray<OwnedAlbumTrack>
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
        artworkUrl: musicTrackAssets.artworkUrl,
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
        amountMinor: commerceOffers.amountMinor,
        currency: commerceOffers.currency,
        externalProductId: commerceOffers.externalProductId,
        fractionalDigits: commerceOffers.fractionalDigits,
        productId: commerceOffers.productId,
        provider: commerceOffers.provider,
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
          eq(commerceOffers.status, 'active'),
        ),
      )
      .orderBy(asc(commerceProductAlbums.albumId), asc(commerceOffers.provider)),
  ])
  const tracksByAlbum = new Map<string, PublishedAlbumTrack[]>()
  const offersByAlbum = new Map<string, PublishedAlbumOffer[]>()
  const albumsById: Map<string, (typeof albumTranslations)[number]> = new Map()

  for (const offer of offers) {
    if (isPaymentProvider(offer.provider)) {
      const albumOffers = offersByAlbum.get(offer.albumId) ?? []
      albumOffers.push({
        amountMinor: offer.amountMinor?.toString() ?? null,
        currency: offer.currency,
        externalProductId: offer.externalProductId,
        fractionalDigits: offer.fractionalDigits,
        productId: offer.productId,
        provider: offer.provider,
      })
      offersByAlbum.set(offer.albumId, albumOffers)
    }
  }

  for (const translation of albumTranslations) {
    const current = albumsById.get(translation.id)

    if (current === undefined || translation.locale === locale) {
      albumsById.set(translation.id, translation)
    }
  }

  for (const track of albumTracks) {
    const tracks = tracksByAlbum.get(track.albumId) ?? []
    tracks.push({
      artist: track.artist,
      artworkUrl: track.artworkUrl ?? undefined,
      id: track.id,
      title: track.title,
    })
    tracksByAlbum.set(track.albumId, tracks)
  }

  return [...albumsById.values()].map((album) => {
    const albumOffers = offersByAlbum.get(album.id) ?? []
    const appsInTossOffer = albumOffers.find((offer) => offer.provider === 'apps-in-toss')
    const sale: PublishedAlbumSale =
      appsInTossOffer === undefined
        ? {state: 'preparing'}
        : {externalProductId: appsInTossOffer.externalProductId, state: 'configured'}

    const tracks = tracksByAlbum.get(album.id) ?? []
    const publishedAlbum = {
      coverFallback: album.coverFallback,
      coverImageUrl: album.coverImageUrl,
      description: album.description,
      id: album.id,
      sale,
      title: album.title,
      trackCount: tracks.length,
      tracks,
    }

    if (albumOffers.length === 0) {
      return publishedAlbum
    }

    return {...publishedAlbum, offers: albumOffers, productId: albumOffers[0].productId}
  })
}

export const listOwnedAlbums = async (
  userId: string,
  locale: PublishedAlbumLocale = 'ko',
  now: Date = new Date(),
): Promise<ReadonlyArray<OwnedAlbum>> => {
  const database = getDatabase()
  const requestedLocales: ReadonlyArray<PublishedAlbumLocale> =
    locale === 'ko' ? ['ko'] : ['en', 'ko']
  const [albumRows, trackRows] = await Promise.all([
    database
      .select({
        coverFallback: musicAlbums.coverFallback,
        coverImageUrl: musicAlbums.coverImageUrl,
        description: musicAlbumTranslations.description,
        id: musicAlbums.id,
        locale: musicAlbumTranslations.locale,
        productId: commerceEntitlementGrants.productId,
        publishedAt: musicAlbums.publishedAt,
        title: musicAlbumTranslations.title,
      })
      .from(commerceEntitlementGrants)
      .innerJoin(
        commerceProductAlbums,
        eq(commerceProductAlbums.productId, commerceEntitlementGrants.productId),
      )
      .innerJoin(musicAlbums, eq(musicAlbums.id, commerceProductAlbums.albumId))
      .innerJoin(musicAlbumTranslations, eq(musicAlbumTranslations.albumId, musicAlbums.id))
      .where(
        and(
          eq(commerceEntitlementGrants.userId, userId),
          isNull(commerceEntitlementGrants.revokedAt),
          lte(commerceEntitlementGrants.startsAt, now),
          or(isNull(commerceEntitlementGrants.endsAt), gt(commerceEntitlementGrants.endsAt, now)),
          inArray(musicAlbums.status, ['published', 'archived']),
          inArray(musicAlbumTranslations.locale, requestedLocales),
        ),
      )
      .orderBy(desc(musicAlbums.publishedAt)),
    database
      .select({
        albumId: musicAlbumTracks.albumId,
        artist: musicTracks.artist,
        artworkUrl: musicTrackAssets.artworkUrl,
        durationMs: musicTrackAssets.durationMs,
        id: musicTracks.id,
        position: musicAlbumTracks.position,
        title: musicTracks.title,
      })
      .from(commerceEntitlementGrants)
      .innerJoin(
        commerceProductAlbums,
        eq(commerceProductAlbums.productId, commerceEntitlementGrants.productId),
      )
      .innerJoin(musicAlbums, eq(musicAlbums.id, commerceProductAlbums.albumId))
      .innerJoin(musicAlbumTracks, eq(musicAlbumTracks.albumId, musicAlbums.id))
      .innerJoin(musicTracks, eq(musicTracks.id, musicAlbumTracks.trackId))
      .innerJoin(musicTrackAssets, eq(musicTrackAssets.trackId, musicAlbumTracks.trackId))
      .where(
        and(
          eq(commerceEntitlementGrants.userId, userId),
          isNull(commerceEntitlementGrants.revokedAt),
          lte(commerceEntitlementGrants.startsAt, now),
          or(isNull(commerceEntitlementGrants.endsAt), gt(commerceEntitlementGrants.endsAt, now)),
          inArray(musicAlbums.status, ['published', 'archived']),
          eq(musicTrackAssets.status, 'active'),
        ),
      )
      .orderBy(asc(musicAlbumTracks.albumId), asc(musicAlbumTracks.position)),
  ])
  const albumsById: Map<string, (typeof albumRows)[number]> = new Map()
  const productIdsByAlbum = new Map<string, string>()
  const tracksByAlbum = new Map<string, OwnedAlbumTrack[]>()
  const trackIdsByAlbum = new Map<string, Set<string>>()

  for (const album of albumRows) {
    const current = albumsById.get(album.id)

    if (current === undefined || album.locale === locale) {
      albumsById.set(album.id, album)
    }
    productIdsByAlbum.set(album.id, productIdsByAlbum.get(album.id) ?? album.productId)
  }

  for (const track of trackRows) {
    if (track.durationMs !== null) {
      const trackIds = trackIdsByAlbum.get(track.albumId) ?? new Set<string>()

      if (!trackIds.has(track.id)) {
        trackIds.add(track.id)
        trackIdsByAlbum.set(track.albumId, trackIds)
        const tracks = tracksByAlbum.get(track.albumId) ?? []
        tracks.push({
          artist: track.artist,
          artworkUrl: track.artworkUrl ?? undefined,
          durationSeconds: track.durationMs / MILLISECONDS_PER_SECOND,
          id: track.id,
          title: track.title,
        })
        tracksByAlbum.set(track.albumId, tracks)
      }
    }
  }

  return [...albumsById.values()].map((album) => {
    const tracks = tracksByAlbum.get(album.id) ?? []
    return {
      coverFallback: album.coverFallback,
      coverImageUrl: album.coverImageUrl,
      description: album.description,
      id: album.id,
      productId: productIdsByAlbum.get(album.id) ?? album.productId,
      title: album.title,
      trackCount: tracks.length,
      tracks,
    }
  })
}
