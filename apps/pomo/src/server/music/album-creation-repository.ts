import {and, eq, gt} from 'drizzle-orm'

import {
  musicAlbumCoverReservations,
  musicAlbums,
  musicAlbumTranslations,
  type TransactionalDatabase,
  withTransactionalDatabase,
} from '../database'
import {
  type AlbumCreationStore,
  type CreateAlbumInput,
  type CreateAlbumResult,
  createAlbumWithStore,
} from './album-creation'

export type {CreateAlbumInput, CreateAlbumResult} from './album-creation'

type MusicTransaction = Parameters<Parameters<TransactionalDatabase['transaction']>[0]>[0]

const createAlbumStore = (transaction: MusicTransaction): AlbumCreationStore => ({
  deleteCoverReservation: async (id) => {
    await transaction
      .delete(musicAlbumCoverReservations)
      .where(eq(musicAlbumCoverReservations.id, id))
  },
  insertAlbum: async (input) => {
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

    return album ?? null
  },
  insertTranslations: async (albumId, translations) =>
    transaction
      .insert(musicAlbumTranslations)
      .values(translations.map((translation) => ({...translation, albumId})))
      .returning({
        albumId: musicAlbumTranslations.albumId,
        description: musicAlbumTranslations.description,
        locale: musicAlbumTranslations.locale,
        title: musicAlbumTranslations.title,
      }),
  lockCoverReservation: async ({id, now}) => {
    const [reservation] = await transaction
      .select({
        coverImageUrl: musicAlbumCoverReservations.coverImageUrl,
        draftId: musicAlbumCoverReservations.draftId,
      })
      .from(musicAlbumCoverReservations)
      .where(
        and(
          eq(musicAlbumCoverReservations.id, id),
          eq(musicAlbumCoverReservations.status, 'pending'),
          gt(musicAlbumCoverReservations.expiresAt, now),
        ),
      )
      .for('update')
      .limit(1)

    return reservation ?? null
  },
  markCoverForDeletion: async ({coverDraftId, coverImageUrl, coverReservationId, now}) => {
    await transaction
      .update(musicAlbumCoverReservations)
      .set({status: 'deleting', updatedAt: now})
      .where(
        and(
          eq(musicAlbumCoverReservations.id, coverReservationId),
          eq(musicAlbumCoverReservations.draftId, coverDraftId),
          eq(musicAlbumCoverReservations.coverImageUrl, coverImageUrl),
          eq(musicAlbumCoverReservations.status, 'pending'),
        ),
      )
  },
  readAlbum: async (id) => {
    const [album] = await transaction
      .select({
        coverDraftId: musicAlbums.coverDraftId,
        coverFallback: musicAlbums.coverFallback,
        coverImageUrl: musicAlbums.coverImageUrl,
        id: musicAlbums.id,
        status: musicAlbums.status,
      })
      .from(musicAlbums)
      .where(eq(musicAlbums.id, id))
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
      .where(eq(musicAlbumTranslations.albumId, id))

    return {...album, translations}
  },
})

export const createAlbum = async (input: CreateAlbumInput): Promise<CreateAlbumResult> =>
  withTransactionalDatabase((database) =>
    database.transaction((transaction) =>
      createAlbumWithStore(input, createAlbumStore(transaction), new Date()),
    ),
  )
