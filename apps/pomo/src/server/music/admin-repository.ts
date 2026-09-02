import {and, asc, desc, eq, gt} from 'drizzle-orm'

import {
  commerceOffers,
  commerceProductAlbums,
  commerceProducts,
  getDatabase,
  musicAlbumCoverReservations,
  musicAlbums,
  musicAlbumTracks,
  musicAlbumTranslations,
  musicTrackAssets,
  musicTrackRegistrations,
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
  readonly coverDraftId: string | null
  readonly coverImageUrl: string | null
  readonly coverReservationId: string | null
  readonly id: string
  readonly translations: ReadonlyArray<{
    readonly description: string
    readonly locale: 'en' | 'ja' | 'ko' | 'zh-Hans'
    readonly title: string
  }>
}

export type CreateAlbumResult =
  | {
      readonly code: 'album_creation_payload_mismatch' | 'cover_reservation_invalid'
      readonly success: false
    }
  | {
      readonly album: {
        readonly coverFallback: 'lp' | 'cd' | 'music'
        readonly coverImageUrl: string | null
        readonly id: string
        readonly status: 'archived' | 'draft' | 'published'
        readonly translations: ReadonlyArray<{
          readonly albumId: string
          readonly description: string
          readonly locale: 'en' | 'ja' | 'ko' | 'zh-Hans'
          readonly title: string
        }>
      }
      readonly success: true
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
  const [albums, translations, tracks, pendingTracks, assets, offers] = await Promise.all([
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
        albumId: musicTrackRegistrations.albumId,
        artist: musicTracks.artist,
        id: musicTracks.id,
        title: musicTracks.title,
      })
      .from(musicTrackRegistrations)
      .innerJoin(musicTracks, eq(musicTrackRegistrations.trackId, musicTracks.id))
      .orderBy(asc(musicTrackRegistrations.albumId), asc(musicTrackRegistrations.createdAt)),
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
    pendingTracks,
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

interface CreatedAlbum {
  readonly coverDraftId: string | null
  readonly coverFallback: 'lp' | 'cd' | 'music'
  readonly coverImageUrl: string | null
  readonly id: string
  readonly status: 'archived' | 'draft' | 'published'
  readonly translations: ReadonlyArray<{
    readonly albumId: string
    readonly description: string
    readonly locale: 'en' | 'ja' | 'ko' | 'zh-Hans'
    readonly title: string
  }>
}

const sortTranslationsByLocale = <T extends {readonly locale: string}>(
  translations: ReadonlyArray<T>,
): T[] => [...translations].sort((left, right) => left.locale.localeCompare(right.locale))

const matchesCreationInput = (existing: CreatedAlbum, candidate: CreateAlbumInput): boolean => {
  const coverMatches =
    existing.coverDraftId === candidate.coverDraftId &&
    (candidate.coverDraftId !== null || existing.coverImageUrl === candidate.coverImageUrl)

  if (
    !coverMatches ||
    existing.coverFallback !== candidate.coverFallback ||
    existing.translations.length !== candidate.translations.length
  ) {
    return false
  }

  const existingTranslations = sortTranslationsByLocale(existing.translations)
  const candidateTranslations = sortTranslationsByLocale(candidate.translations)

  return existingTranslations.every((existingTranslation, index) => {
    const candidateTranslation = candidateTranslations[index]

    return (
      existingTranslation.locale === candidateTranslation.locale &&
      existingTranslation.title === candidateTranslation.title &&
      existingTranslation.description === candidateTranslation.description
    )
  })
}

export const createAlbum = async (input: CreateAlbumInput): Promise<CreateAlbumResult> =>
  withTransactionalDatabase((database) =>
    database.transaction(async (transaction) => {
      const readCreatedAlbum = async (): Promise<CreatedAlbum | null> => {
        const [album] = await transaction
          .select({
            coverDraftId: musicAlbums.coverDraftId,
            coverFallback: musicAlbums.coverFallback,
            coverImageUrl: musicAlbums.coverImageUrl,
            id: musicAlbums.id,
            status: musicAlbums.status,
          })
          .from(musicAlbums)
          .where(eq(musicAlbums.id, input.id))
          .limit(1)

        if (album === undefined) {
          return null
        }

        const translations = await transaction
          .select({
            albumId: musicAlbumTranslations.albumId,
            description: musicAlbumTranslations.description,
            locale: musicAlbumTranslations.locale,
            title: musicAlbumTranslations.title,
          })
          .from(musicAlbumTranslations)
          .where(eq(musicAlbumTranslations.albumId, input.id))

        return {...album, translations}
      }
      const returnMatchingCreatedAlbum = async (
        existingAlbum: CreatedAlbum,
      ): Promise<CreateAlbumResult> => {
        await prepareUnusedCoverDeletion()

        if (!matchesCreationInput(existingAlbum, input)) {
          return {code: 'album_creation_payload_mismatch', success: false}
        }

        return {
          album: {
            coverFallback: existingAlbum.coverFallback,
            coverImageUrl: existingAlbum.coverImageUrl,
            id: existingAlbum.id,
            status: existingAlbum.status,
            translations: existingAlbum.translations,
          },
          success: true,
        }
      }
      const prepareUnusedCoverDeletion = async (): Promise<void> => {
        if (
          input.coverReservationId === null ||
          input.coverDraftId === null ||
          input.coverImageUrl === null
        ) {
          return
        }

        await transaction
          .update(musicAlbumCoverReservations)
          .set({status: 'deleting', updatedAt: new Date()})
          .where(
            and(
              eq(musicAlbumCoverReservations.id, input.coverReservationId),
              eq(musicAlbumCoverReservations.draftId, input.coverDraftId),
              eq(musicAlbumCoverReservations.coverImageUrl, input.coverImageUrl),
              eq(musicAlbumCoverReservations.status, 'pending'),
            ),
          )
      }

      if ((input.coverReservationId === null) !== (input.coverDraftId === null)) {
        return {code: 'cover_reservation_invalid', success: false}
      }

      if (input.coverReservationId !== null) {
        const existingAlbum = await readCreatedAlbum()

        if (existingAlbum !== null) {
          return returnMatchingCreatedAlbum(existingAlbum)
        }

        const [reservation] = await transaction
          .select({
            coverImageUrl: musicAlbumCoverReservations.coverImageUrl,
            draftId: musicAlbumCoverReservations.draftId,
          })
          .from(musicAlbumCoverReservations)
          .where(
            and(
              eq(musicAlbumCoverReservations.id, input.coverReservationId),
              eq(musicAlbumCoverReservations.status, 'pending'),
              gt(musicAlbumCoverReservations.expiresAt, new Date()),
            ),
          )
          .for('update')
          .limit(1)

        if (
          reservation === undefined ||
          reservation.draftId !== input.coverDraftId ||
          reservation.coverImageUrl !== input.coverImageUrl
        ) {
          const concurrentlyCreatedAlbum = await readCreatedAlbum()

          if (concurrentlyCreatedAlbum !== null) {
            return returnMatchingCreatedAlbum(concurrentlyCreatedAlbum)
          }

          return {code: 'cover_reservation_invalid', success: false}
        }
      }

      const [album] = await transaction
        .insert(musicAlbums)
        .values({
          coverDraftId: input.coverDraftId,
          coverFallback: input.coverFallback,
          coverImageUrl: input.coverImageUrl,
          id: input.id,
        })
        .onConflictDoNothing({target: musicAlbums.id})
        .returning({
          coverFallback: musicAlbums.coverFallback,
          coverImageUrl: musicAlbums.coverImageUrl,
          id: musicAlbums.id,
          status: musicAlbums.status,
        })

      if (album === undefined) {
        const concurrentlyCreatedAlbum = await readCreatedAlbum()

        if (concurrentlyCreatedAlbum === null) {
          throw new Error('Failed to create a music album')
        }

        return returnMatchingCreatedAlbum(concurrentlyCreatedAlbum)
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

      if (input.coverReservationId !== null) {
        await transaction
          .delete(musicAlbumCoverReservations)
          .where(eq(musicAlbumCoverReservations.id, input.coverReservationId))
      }

      return {album: {...album, translations}, success: true}
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

      switch (product) {
        case undefined:
          throw new Error('Failed to create or restore a commerce product')
        default:
          break
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
