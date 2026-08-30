import 'server-only'

import {and, asc, eq, gt, lte, or} from 'drizzle-orm'

import {getDatabase, musicAlbumCoverReservations, withTransactionalDatabase} from '../database'

const MILLISECONDS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60
const RESERVATION_HOURS = 24
const RESERVATION_MILLISECONDS =
  RESERVATION_HOURS * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND

export interface AlbumCoverReservation {
  readonly id: string
  readonly objectKey: string
}

export interface AlbumCoverCleanupCandidate {
  readonly id: string
}

interface CreateAlbumCoverReservationOptions {
  readonly id?: string
  readonly now?: Date
}

export const createAlbumCoverReservation = async (
  draftId: string,
  options: CreateAlbumCoverReservationOptions = {},
): Promise<AlbumCoverReservation> => {
  const id = options.id ?? crypto.randomUUID()
  const now = options.now ?? new Date()
  const objectKey = `album-covers/${id}/cover.webp`
  const [reservation] = await getDatabase()
    .insert(musicAlbumCoverReservations)
    .values({
      draftId,
      expiresAt: new Date(now.getTime() + RESERVATION_MILLISECONDS),
      id,
      objectKey,
    })
    .returning({
      id: musicAlbumCoverReservations.id,
      objectKey: musicAlbumCoverReservations.objectKey,
    })

  if (reservation === undefined) {
    throw new Error('Failed to create an album cover reservation')
  }

  return reservation
}

export const completeAlbumCoverReservation = async (
  id: string,
  coverImageUrl: string,
  now = new Date(),
): Promise<boolean> => {
  const [reservation] = await getDatabase()
    .update(musicAlbumCoverReservations)
    .set({coverImageUrl, status: 'pending', updatedAt: now})
    .where(
      and(
        eq(musicAlbumCoverReservations.id, id),
        eq(musicAlbumCoverReservations.status, 'uploading'),
        gt(musicAlbumCoverReservations.expiresAt, now),
      ),
    )
    .returning({id: musicAlbumCoverReservations.id})

  return reservation !== undefined
}

export const listAlbumCoverCleanupCandidates = async (
  now: Date,
  limit: number,
): Promise<ReadonlyArray<AlbumCoverCleanupCandidate>> =>
  getDatabase()
    .select({id: musicAlbumCoverReservations.id})
    .from(musicAlbumCoverReservations)
    .where(
      or(
        eq(musicAlbumCoverReservations.status, 'deleting'),
        lte(musicAlbumCoverReservations.expiresAt, now),
      ),
    )
    .orderBy(asc(musicAlbumCoverReservations.expiresAt), asc(musicAlbumCoverReservations.id))
    .limit(limit)

export const prepareAlbumCoverDeletion = async (id: string, now: Date): Promise<string | null> =>
  withTransactionalDatabase((database) =>
    database.transaction(async (transaction) => {
      const [reservation] = await transaction
        .select({
          expiresAt: musicAlbumCoverReservations.expiresAt,
          objectKey: musicAlbumCoverReservations.objectKey,
          status: musicAlbumCoverReservations.status,
        })
        .from(musicAlbumCoverReservations)
        .where(eq(musicAlbumCoverReservations.id, id))
        .for('update')
        .limit(1)

      if (
        reservation === undefined ||
        (reservation.status !== 'deleting' && reservation.expiresAt > now)
      ) {
        return null
      }

      if (reservation.status !== 'deleting') {
        await transaction
          .update(musicAlbumCoverReservations)
          .set({status: 'deleting', updatedAt: now})
          .where(eq(musicAlbumCoverReservations.id, id))
      }

      return reservation.objectKey
    }),
  )

export const finalizeAlbumCoverDeletion = async (id: string): Promise<boolean> => {
  const [reservation] = await getDatabase()
    .delete(musicAlbumCoverReservations)
    .where(
      and(
        eq(musicAlbumCoverReservations.id, id),
        eq(musicAlbumCoverReservations.status, 'deleting'),
      ),
    )
    .returning({id: musicAlbumCoverReservations.id})

  return reservation !== undefined
}
