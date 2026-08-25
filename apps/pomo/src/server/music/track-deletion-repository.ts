import {and, eq, isNotNull, lte} from 'drizzle-orm'

import {
  getDatabase,
  musicAlbumTracks,
  musicTrackAssets,
  musicTrackDeletionJobs,
  musicTrackRegistrations,
  musicTracks,
  withTransactionalDatabase,
} from '../database'

export interface PrepareTrackDeletionOptions {
  readonly staleBefore?: Date
}

export const prepareTrackDeletion = async (
  trackId: string,
  options: PrepareTrackDeletionOptions = {},
) =>
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

      if (options.staleBefore !== undefined) {
        const [registration] = await transaction
          .select({trackId: musicTrackRegistrations.trackId})
          .from(musicTrackRegistrations)
          .where(
            and(
              eq(musicTrackRegistrations.trackId, trackId),
              lte(musicTrackRegistrations.createdAt, options.staleBefore),
            ),
          )
          .for('update')
          .limit(1)

        if (registration === undefined) {
          return null
        }
      }

      const [existingJob] = await transaction
        .select({
          objectKeys: musicTrackDeletionJobs.objectKeys,
          storageDeletedAt: musicTrackDeletionJobs.storageDeletedAt,
        })
        .from(musicTrackDeletionJobs)
        .where(eq(musicTrackDeletionJobs.trackId, trackId))
        .limit(1)
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
