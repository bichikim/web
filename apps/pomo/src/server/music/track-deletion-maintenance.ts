import {asc, lte} from 'drizzle-orm'

import {settleSequentially} from 'src/utils/settle-sequentially'
import {takeLookaheadBatch} from '../database/take-lookahead-batch'
import {MILLISECONDS_PER_HOUR} from 'src/utils/time-units'

import {getDatabase, musicTrackDeletionJobs, musicTrackRegistrations} from '../database'
import {
  finalizeTrackDeletion,
  markTrackDeletionStorageDeleted,
  prepareTrackDeletion,
} from '../repositories/music-track-deletion'
import {deleteTrackAssetStorage} from './track-storage-deletion'

const FINALIZE_BATCH_SIZE = 25
const BATCH_LOOKAHEAD = 1
const REGISTRATION_STALE_HOURS = 24

export interface TrackDeletionMaintenanceRepository {
  readonly deleteStorage: (objectKeys: ReadonlyArray<string>) => Promise<void>
  readonly finalize: (trackId: string) => Promise<boolean>
  readonly listPending: (limit: number) => Promise<ReadonlyArray<TrackDeletionCandidate>>
  readonly listStale: (
    staleBefore: Date,
    limit: number,
  ) => Promise<ReadonlyArray<TrackRegistrationCandidate>>
  readonly markStorageDeleted: (trackId: string) => Promise<boolean>
  readonly prepareStale: (trackId: string, staleBefore: Date) => Promise<boolean>
}

export interface TrackDeletionCandidate {
  readonly objectKeys: ReadonlyArray<string>
  readonly storageDeleted: boolean
  readonly trackId: string
}

export interface TrackRegistrationCandidate {
  readonly trackId: string
}

export interface TrackDeletionMaintenanceResult {
  readonly complete: boolean
  readonly finalized: number
}

export interface RunTrackDeletionMaintenanceOptions {
  readonly now?: Date
  readonly repository?: TrackDeletionMaintenanceRepository
}

const createRepository = (): TrackDeletionMaintenanceRepository => ({
  deleteStorage: async (objectKeys) => {
    await Promise.all(objectKeys.map((objectKey) => deleteTrackAssetStorage(objectKey)))
  },
  finalize: finalizeTrackDeletion,
  listPending: async (limit) => {
    const database = getDatabase()
    const jobs = await database
      .select({
        objectKeys: musicTrackDeletionJobs.objectKeys,
        storageDeletedAt: musicTrackDeletionJobs.storageDeletedAt,
        trackId: musicTrackDeletionJobs.trackId,
      })
      .from(musicTrackDeletionJobs)
      .orderBy(asc(musicTrackDeletionJobs.updatedAt), asc(musicTrackDeletionJobs.trackId))
      .limit(limit)

    return jobs.map((job) => ({
      objectKeys: job.objectKeys,
      storageDeleted: job.storageDeletedAt !== null,
      trackId: job.trackId,
    }))
  },
  listStale: async (staleBefore, limit) => {
    const database = getDatabase()
    return database
      .select({trackId: musicTrackRegistrations.trackId})
      .from(musicTrackRegistrations)
      .where(lte(musicTrackRegistrations.createdAt, staleBefore))
      .orderBy(asc(musicTrackRegistrations.createdAt), asc(musicTrackRegistrations.trackId))
      .limit(limit)
  },
  markStorageDeleted: markTrackDeletionStorageDeleted,
  prepareStale: async (trackId, staleBefore) =>
    (await prepareTrackDeletion(trackId, {staleBefore})) !== null,
})

const resumeCandidate = async (
  candidate: TrackDeletionCandidate,
  repository: TrackDeletionMaintenanceRepository,
): Promise<boolean> => {
  if (!candidate.storageDeleted) {
    await repository.deleteStorage(candidate.objectKeys)
    await repository.markStorageDeleted(candidate.trackId)
  }

  return repository.finalize(candidate.trackId)
}

/** Claims stale registrations and resumes a bounded batch of track deletions. */
export const runTrackDeletionMaintenance = async (
  options: RunTrackDeletionMaintenanceOptions = {},
): Promise<TrackDeletionMaintenanceResult> => {
  const repository = options.repository ?? createRepository()
  const now = options.now ?? new Date()
  const staleBefore = new Date(now.getTime() - REGISTRATION_STALE_HOURS * MILLISECONDS_PER_HOUR)
  const registrations = await repository.listStale(
    staleBefore,
    FINALIZE_BATCH_SIZE + BATCH_LOOKAHEAD,
  )
  const registrationBatch = takeLookaheadBatch(registrations, {
    batchSize: FINALIZE_BATCH_SIZE,
    label: 'Track registration maintenance',
  })
  const registrationResults = await settleSequentially(registrationBatch.batch, (candidate) =>
    repository.prepareStale(candidate.trackId, staleBefore),
  )
  const candidates = await repository.listPending(FINALIZE_BATCH_SIZE + BATCH_LOOKAHEAD)
  const candidateBatch = takeLookaheadBatch(candidates, {
    batchSize: FINALIZE_BATCH_SIZE,
    label: 'Track deletion maintenance',
  })
  const results = await settleSequentially(candidateBatch.batch, (candidate) =>
    resumeCandidate(candidate, repository),
  )
  const errors = [...registrationResults, ...results].flatMap((result) =>
    result.status === 'rejected' ? [result.reason] : [],
  )

  if (errors.length > 0) {
    throw new AggregateError(errors, 'One or more music track deletions failed')
  }

  return {
    complete: registrationBatch.complete && candidateBatch.complete,
    finalized: results.filter((result) => result.status === 'fulfilled' && result.value).length,
  }
}
