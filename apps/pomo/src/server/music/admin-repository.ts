import {and, asc, desc, eq} from 'drizzle-orm'

import {
  commerceOffers,
  commerceProductAlbums,
  commerceProducts,
  getDatabase,
  musicAlbums,
  musicAlbumTracks,
  musicAlbumTranslations,
  musicTrackAssets,
  musicTracks,
  withTransactionalDatabase,
} from '../database'
import {getAlbumProductCode} from './product-code'
import {getAlbumReleaseReadiness} from './release-policy'

export type AlbumStatusAction = 'archive' | 'publish'

export type UpdateAlbumStatusResult =
  | {readonly code: 'album_not_found' | 'invalid_status_transition'; readonly success: false}
  | {
      readonly blockers: ReturnType<typeof getAlbumReleaseReadiness>['blockers']
      readonly code: 'release_blocked'
      readonly success: false
    }
  | {readonly status: 'archived' | 'published'; readonly success: true}

export interface CreateAlbumInput {
  readonly coverFallback: 'lp' | 'cd' | 'music'
  readonly coverImageUrl: string | null
  readonly translations: ReadonlyArray<{
    readonly description: string
    readonly locale: 'en' | 'ja' | 'ko' | 'zh-Hans'
    readonly title: string
  }>
}

export interface ConnectAlbumOfferInput {
  readonly albumId: string
  readonly externalProductId: string
  readonly provider: 'apps-in-toss'
}

export type ConnectAlbumOfferResult =
  | {readonly code: 'album_not_found' | 'external_product_conflict'; readonly success: false}
  | {readonly success: true}

const requireCommerceProduct = <Product>(product: Product | undefined): Product => {
  if (product === undefined) {
    throw new Error('Failed to create or restore a commerce product')
  }

  return product
}

export const listAdminMusic = async () => {
  const database = getDatabase()
  const [albums, translations, tracks, assets, offers] = await Promise.all([
    database
      .select({
        coverFallback: musicAlbums.coverFallback,
        coverImageUrl: musicAlbums.coverImageUrl,
        id: musicAlbums.id,
        status: musicAlbums.status,
      })
      .from(musicAlbums)
      .orderBy(desc(musicAlbums.createdAt)),
    database
      .select({
        albumId: musicAlbumTranslations.albumId,
        description: musicAlbumTranslations.description,
        locale: musicAlbumTranslations.locale,
        title: musicAlbumTranslations.title,
      })
      .from(musicAlbumTranslations)
      .orderBy(asc(musicAlbumTranslations.albumId), asc(musicAlbumTranslations.locale)),
    database
      .select({
        albumId: musicAlbumTracks.albumId,
        artist: musicTracks.artist,
        id: musicTracks.id,
        position: musicAlbumTracks.position,
        title: musicTracks.title,
      })
      .from(musicAlbumTracks)
      .innerJoin(musicTracks, eq(musicAlbumTracks.trackId, musicTracks.id))
      .orderBy(asc(musicAlbumTracks.albumId), asc(musicAlbumTracks.position)),
    database
      .select({
        id: musicTrackAssets.id,
        status: musicTrackAssets.status,
        trackId: musicTrackAssets.trackId,
      })
      .from(musicTrackAssets)
      .orderBy(desc(musicTrackAssets.createdAt)),
    database
      .select({
        albumId: commerceProductAlbums.albumId,
        billingType: commerceOffers.billingType,
        externalProductId: commerceOffers.externalProductId,
        productCode: commerceProducts.code,
        productStatus: commerceProducts.status,
        provider: commerceOffers.provider,
        status: commerceOffers.status,
      })
      .from(commerceProductAlbums)
      .innerJoin(commerceProducts, eq(commerceProductAlbums.productId, commerceProducts.id))
      .innerJoin(commerceOffers, eq(commerceOffers.productId, commerceProducts.id))
      .orderBy(asc(commerceProductAlbums.albumId), asc(commerceOffers.provider)),
  ])
  const activeAssetTrackIds = new Set(
    assets.filter((asset) => asset.status === 'active').map((asset) => asset.trackId),
  )
  const trackIdsByAlbum = new Map<string, string[]>()

  for (const track of tracks) {
    const trackIds = trackIdsByAlbum.get(track.albumId) ?? []
    trackIds.push(track.id)
    trackIdsByAlbum.set(track.albumId, trackIds)
  }

  return {
    albums: albums.map((album) => {
      const albumTrackIds = trackIdsByAlbum.get(album.id) ?? []

      return {
        ...album,
        release: getAlbumReleaseReadiness({
          activeAssetTrackCount: albumTrackIds.filter((trackId) => activeAssetTrackIds.has(trackId))
            .length,
          trackCount: albumTrackIds.length,
        }),
        translations: translations.filter((translation) => translation.albumId === album.id),
      }
    }),
    assets,
    offers,
    tracks,
  }
}

export const updateAlbumStatus = async (
  albumId: string,
  action: AlbumStatusAction,
): Promise<UpdateAlbumStatusResult> =>
  withTransactionalDatabase((database) =>
    database.transaction(async (transaction) => {
      const [album] = await transaction
        .select({publishedAt: musicAlbums.publishedAt, status: musicAlbums.status})
        .from(musicAlbums)
        .where(eq(musicAlbums.id, albumId))
        .for('update')
        .limit(1)

      if (album === undefined) {
        return {code: 'album_not_found', success: false}
      }

      if (action === 'archive') {
        if (album.status !== 'published') {
          return {code: 'invalid_status_transition', success: false}
        }

        await transaction
          .update(musicAlbums)
          .set({status: 'archived', updatedAt: new Date()})
          .where(and(eq(musicAlbums.id, albumId), eq(musicAlbums.status, 'published')))
        return {status: 'archived', success: true}
      }

      if (album.status === 'published') {
        return {code: 'invalid_status_transition', success: false}
      }

      const albumTracks = await transaction
        .select({activeAssetTrackId: musicTrackAssets.trackId, trackId: musicAlbumTracks.trackId})
        .from(musicAlbumTracks)
        .leftJoin(
          musicTrackAssets,
          and(
            eq(musicAlbumTracks.trackId, musicTrackAssets.trackId),
            eq(musicTrackAssets.status, 'active'),
          ),
        )
        .where(eq(musicAlbumTracks.albumId, albumId))
      const trackIds = new Set(albumTracks.map((track) => track.trackId))
      const activeAssetTrackIds = new Set(
        albumTracks.flatMap((track) =>
          track.activeAssetTrackId === null ? [] : [track.activeAssetTrackId],
        ),
      )
      const release = getAlbumReleaseReadiness({
        activeAssetTrackCount: activeAssetTrackIds.size,
        trackCount: trackIds.size,
      })

      if (!release.ready) {
        return {blockers: release.blockers, code: 'release_blocked', success: false}
      }

      const now = new Date()
      await transaction
        .update(musicAlbums)
        .set({publishedAt: album.publishedAt ?? now, status: 'published', updatedAt: now})
        .where(and(eq(musicAlbums.id, albumId), eq(musicAlbums.status, album.status)))
      return {status: 'published', success: true}
    }),
  )

export const createAlbum = async (input: CreateAlbumInput) =>
  withTransactionalDatabase((database) =>
    database.transaction(async (transaction) => {
      const [album] = await transaction
        .insert(musicAlbums)
        .values({coverFallback: input.coverFallback, coverImageUrl: input.coverImageUrl})
        .returning({
          coverFallback: musicAlbums.coverFallback,
          coverImageUrl: musicAlbums.coverImageUrl,
          id: musicAlbums.id,
          status: musicAlbums.status,
        })

      if (album === undefined) {
        throw new Error('Failed to create a music album')
      }

      const translations = await transaction
        .insert(musicAlbumTranslations)
        .values(input.translations.map((translation) => ({...translation, albumId: album.id})))
        .returning({
          albumId: musicAlbumTranslations.albumId,
          description: musicAlbumTranslations.description,
          locale: musicAlbumTranslations.locale,
          title: musicAlbumTranslations.title,
        })

      return {...album, translations}
    }),
  )

export const connectAlbumOffer = async (
  input: ConnectAlbumOfferInput,
): Promise<ConnectAlbumOfferResult> =>
  withTransactionalDatabase((database) =>
    database.transaction(async (transaction) => {
      const [album] = await transaction
        .select({id: musicAlbums.id})
        .from(musicAlbums)
        .where(eq(musicAlbums.id, input.albumId))
        .for('update')
        .limit(1)

      if (album === undefined) {
        return {code: 'album_not_found', success: false}
      }

      const [existingAlbumProduct] = await transaction
        .select({id: commerceProducts.id})
        .from(commerceProductAlbums)
        .innerJoin(commerceProducts, eq(commerceProductAlbums.productId, commerceProducts.id))
        .where(eq(commerceProductAlbums.albumId, input.albumId))
        .limit(1)
      const [existingOffer] = await transaction
        .select({productId: commerceOffers.productId})
        .from(commerceOffers)
        .where(
          and(
            eq(commerceOffers.provider, input.provider),
            eq(commerceOffers.externalProductId, input.externalProductId),
          ),
        )
        .limit(1)
      if (existingOffer !== undefined && existingOffer.productId !== existingAlbumProduct?.id) {
        return {code: 'external_product_conflict', success: false}
      }

      const [product] =
        existingAlbumProduct === undefined
          ? await transaction
              .insert(commerceProducts)
              .values({code: getAlbumProductCode(input.albumId)})
              .onConflictDoUpdate({
                set: {status: 'active', updatedAt: new Date()},
                target: commerceProducts.code,
              })
              .returning({id: commerceProducts.id})
          : await transaction
              .update(commerceProducts)
              .set({status: 'active', updatedAt: new Date()})
              .where(eq(commerceProducts.id, existingAlbumProduct.id))
              .returning({id: commerceProducts.id})

      const connectedProduct = requireCommerceProduct(product)

      await transaction
        .insert(commerceProductAlbums)
        .values({albumId: input.albumId, productId: connectedProduct.id})
        .onConflictDoNothing()
      await transaction
        .insert(commerceOffers)
        .values({
          billingType: 'one_time',
          externalProductId: input.externalProductId,
          productId: connectedProduct.id,
          provider: input.provider,
          status: 'active',
        })
        .onConflictDoUpdate({
          set: {
            billingType: 'one_time',
            externalProductId: input.externalProductId,
            status: 'active',
            updatedAt: new Date(),
          },
          target: [commerceOffers.productId, commerceOffers.provider],
        })

      return {success: true}
    }),
  )
