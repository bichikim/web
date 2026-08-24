import {and, asc, desc, eq, isNotNull, max} from 'drizzle-orm'

import {
  commerceOffers,
  commerceProductAlbums,
  commerceProducts,
  getDatabase,
  musicAlbums,
  musicAlbumTracks,
  musicAlbumTranslations,
  musicTrackAssets,
  musicTrackDeletionJobs,
  musicTracks,
  withTransactionalDatabase,
} from '../database'
import {getAlbumProductCode} from './product-code'
import {createTrackAssetKey} from './asset-key'
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

export interface CreateTrackInput {
  readonly albumId: string
  readonly artist: string
  readonly title: string
}

export interface ActivateTrackAssetInput {
  readonly assetId: string
  readonly durationMs: number
  readonly etag: string
  readonly sizeBytes: bigint
}

export interface ConnectAlbumOfferInput {
  readonly albumId: string
  readonly externalProductId: string
  readonly provider: 'apps-in-toss'
}

export type ConnectAlbumOfferResult =
  | {readonly code: 'album_not_found' | 'external_product_conflict'; readonly success: false}
  | {readonly success: true}

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
      .innerJoin(
        musicTrackAssets,
        and(eq(musicTrackAssets.trackId, musicTracks.id), eq(musicTrackAssets.status, 'active')),
      )
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
        .selectDistinct({trackId: musicAlbumTracks.trackId})
        .from(musicAlbumTracks)
        .innerJoin(musicTrackAssets, eq(musicAlbumTracks.trackId, musicTrackAssets.trackId))
        .where(and(eq(musicAlbumTracks.albumId, albumId), eq(musicTrackAssets.status, 'active')))
      const release = getAlbumReleaseReadiness({
        activeAssetTrackCount: albumTracks.length,
        trackCount: albumTracks.length,
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

      if (product === undefined) {
        throw new Error('Failed to create or restore a commerce product')
      }

      await transaction
        .insert(commerceProductAlbums)
        .values({albumId: input.albumId, productId: product.id})
        .onConflictDoNothing()
      await transaction
        .insert(commerceOffers)
        .values({
          billingType: 'one_time',
          externalProductId: input.externalProductId,
          productId: product.id,
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

export const createTrack = async (input: CreateTrackInput) =>
  withTransactionalDatabase((database) =>
    database.transaction(async (transaction) => {
      const [album] = await transaction
        .select({id: musicAlbums.id})
        .from(musicAlbums)
        .where(eq(musicAlbums.id, input.albumId))
        .for('update')
        .limit(1)

      if (album === undefined) {
        return null
      }

      const [positionResult] = await transaction
        .select({position: max(musicAlbumTracks.position)})
        .from(musicAlbumTracks)
        .where(eq(musicAlbumTracks.albumId, input.albumId))
      const position = (positionResult?.position ?? -1) + 1
      const [track] = await transaction
        .insert(musicTracks)
        .values({artist: input.artist, title: input.title})
        .returning({artist: musicTracks.artist, id: musicTracks.id, title: musicTracks.title})

      if (track === undefined) {
        throw new Error('Failed to create a music track')
      }

      await transaction.insert(musicAlbumTracks).values({
        albumId: input.albumId,
        position,
        trackId: track.id,
      })

      return {...track, albumId: input.albumId, position}
    }),
  )

export const reserveTrackAsset = async (trackId: string) =>
  withTransactionalDatabase((database) =>
    database.transaction(async (transaction) => {
      const [track] = await transaction
        .select({id: musicTracks.id})
        .from(musicTracks)
        .where(eq(musicTracks.id, trackId))
        .for('update')
        .limit(1)

      if (track === undefined) {
        return null
      }

      const assetId = crypto.randomUUID()
      const objectKey = createTrackAssetKey({assetId, trackId})
      await transaction.insert(musicTrackAssets).values({id: assetId, objectKey, trackId})
      return {assetId, objectKey}
    }),
  )

export const activateTrackAsset = async (input: ActivateTrackAssetInput): Promise<boolean> =>
  withTransactionalDatabase((database) =>
    database.transaction(async (transaction) => {
      const [asset] = await transaction
        .select({status: musicTrackAssets.status, trackId: musicTrackAssets.trackId})
        .from(musicTrackAssets)
        .where(eq(musicTrackAssets.id, input.assetId))
        .for('update')
        .limit(1)

      if (asset === undefined || asset.status !== 'pending') {
        return false
      }

      const now = new Date()
      await transaction
        .update(musicTrackAssets)
        .set({retiredAt: now, status: 'retired'})
        .where(
          and(eq(musicTrackAssets.trackId, asset.trackId), eq(musicTrackAssets.status, 'active')),
        )
      const [activatedAsset] = await transaction
        .update(musicTrackAssets)
        .set({
          activatedAt: now,
          contentType: 'audio/mpeg',
          durationMs: input.durationMs,
          etag: input.etag,
          sizeBytes: input.sizeBytes,
          status: 'active',
          uploadedAt: now,
          validatedAt: now,
        })
        .where(and(eq(musicTrackAssets.id, input.assetId), eq(musicTrackAssets.status, 'pending')))
        .returning({id: musicTrackAssets.id})

      return activatedAsset !== undefined
    }),
  )

export const failTrackAsset = async (assetId: string, failureCode: string): Promise<void> => {
  const database = getDatabase()
  await database
    .update(musicTrackAssets)
    .set({failureCode, status: 'failed'})
    .where(and(eq(musicTrackAssets.id, assetId), eq(musicTrackAssets.status, 'pending')))
}

export const findPendingTrackAsset = async (assetId: string) => {
  const database = getDatabase()
  const [asset] = await database
    .select({id: musicTrackAssets.id, objectKey: musicTrackAssets.objectKey})
    .from(musicTrackAssets)
    .where(and(eq(musicTrackAssets.id, assetId), eq(musicTrackAssets.status, 'pending')))
    .limit(1)

  return asset ?? null
}

export const findActiveTrackAsset = async (trackId: string) => {
  const database = getDatabase()
  const [asset] = await database
    .select({assetId: musicTrackAssets.id, objectKey: musicTrackAssets.objectKey})
    .from(musicTrackAssets)
    .where(and(eq(musicTrackAssets.trackId, trackId), eq(musicTrackAssets.status, 'active')))
    .limit(1)

  return asset ?? null
}

export const prepareTrackDeletion = async (trackId: string) =>
  withTransactionalDatabase((database) =>
    database.transaction(async (transaction) => {
      const [track] = await transaction
        .select({id: musicTracks.id})
        .from(musicTracks)
        .where(eq(musicTracks.id, trackId))
        .for('update')
        .limit(1)
      const [existingJob] = await transaction
        .select({
          objectKeys: musicTrackDeletionJobs.objectKeys,
          storageDeletedAt: musicTrackDeletionJobs.storageDeletedAt,
        })
        .from(musicTrackDeletionJobs)
        .where(eq(musicTrackDeletionJobs.trackId, trackId))
        .limit(1)
      const [albumTrack] = await transaction
        .select({trackId: musicAlbumTracks.trackId})
        .from(musicAlbumTracks)
        .where(eq(musicAlbumTracks.trackId, trackId))
        .limit(1)

      if (track === undefined || albumTrack === undefined) {
        return null
      }

      if (existingJob !== undefined) {
        return {
          objectKeys: existingJob.objectKeys,
          storageDeleted: existingJob.storageDeletedAt !== null,
        }
      }

      const assets = await transaction
        .select({objectKey: musicTrackAssets.objectKey, status: musicTrackAssets.status})
        .from(musicTrackAssets)
        .where(eq(musicTrackAssets.trackId, trackId))
      const objectKeys = assets
        .toSorted(
          (left, right) => Number(left.status === 'active') - Number(right.status === 'active'),
        )
        .map((asset) => asset.objectKey)
      await transaction.insert(musicTrackDeletionJobs).values({objectKeys, trackId})
      return {objectKeys, storageDeleted: false}
    }),
  )

export const markTrackDeletionStorageDeleted = async (trackId: string): Promise<boolean> => {
  const database = getDatabase()
  const [job] = await database
    .update(musicTrackDeletionJobs)
    .set({storageDeletedAt: new Date(), updatedAt: new Date()})
    .where(eq(musicTrackDeletionJobs.trackId, trackId))
    .returning({trackId: musicTrackDeletionJobs.trackId})
  return job !== undefined
}

export const finalizeTrackDeletion = async (trackId: string): Promise<boolean> =>
  withTransactionalDatabase((database) =>
    database.transaction(async (transaction) => {
      const [job] = await transaction
        .select({trackId: musicTrackDeletionJobs.trackId})
        .from(musicTrackDeletionJobs)
        .where(
          and(
            eq(musicTrackDeletionJobs.trackId, trackId),
            isNotNull(musicTrackDeletionJobs.storageDeletedAt),
          ),
        )
        .for('update')
        .limit(1)

      if (job === undefined) {
        return false
      }

      await transaction.delete(musicTrackAssets).where(eq(musicTrackAssets.trackId, trackId))
      await transaction.delete(musicAlbumTracks).where(eq(musicAlbumTracks.trackId, trackId))
      await transaction.delete(musicTracks).where(eq(musicTracks.id, trackId))
      return true
    }),
  )
