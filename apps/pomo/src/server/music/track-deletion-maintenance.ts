import 'server-only'

import {asc} from 'drizzle-orm'

import {getDatabase, musicTrackDeletionJobs} from '../database'
import {finalizeTrackDeletion, markTrackDeletionStorageDeleted} from './admin-repository'
import {deleteTrackAssetStorage} from './track-storage-deletion'

const FINALIZE_BATCH_SIZE = 25
const BATCH_LOOKAHEAD = 1

export interface TrackDeletionMaintenanceRepository {
  readonly deleteStorage: (objectKeys: ReadonlyArray<string>) => Promise<void>
  readonly finalize: (trackId: string) => Promise<boolean>
  readonly listPending: (limit: number) => Promise<ReadonlyArray<TrackDeletionCandidate>>
  readonly markStorageDeleted: (trackId: string) => Promise<boolean>
}

export interface TrackDeletionCandidate {
  readonly objectKeys: ReadonlyArray<string>
  readonly storageDeleted: boolean
  readonly trackId: string
}

export interface TrackDeletionMaintenanceResult {
  readonly complete: boolean
  readonly finalized: number
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
  markStorageDeleted: markTrackDeletionStorageDeleted,
})

interface CandidateProgress {
  readonly errors: ReadonlyArray<unknown>
  readonly finalized: number
}

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

const processCandidates = async (
  candidates: ReadonlyArray<TrackDeletionCandidate>,
  repository: TrackDeletionMaintenanceRepository,
  index = 0,
  progress: CandidateProgress = {errors: [], finalized: 0},
): Promise<CandidateProgress> => {
  const candidate = candidates[index]

  if (candidate === undefined) {
    return progress
  }

  try {
    const deleted = await resumeCandidate(candidate, repository)
    return processCandidates(candidates, repository, index + 1, {
      ...progress,
      finalized: progress.finalized + Number(deleted),
    })
  } catch (error: unknown) {
    return processCandidates(candidates, repository, index + 1, {
      ...progress,
      errors: [...progress.errors, error],
    })
  }
}

/** Resumes a bounded batch of track deletions and finalizes completed records. */
export const runTrackDeletionMaintenance = async (
  repository: TrackDeletionMaintenanceRepository = createRepository(),
): Promise<TrackDeletionMaintenanceResult> => {
  const candidates = await repository.listPending(FINALIZE_BATCH_SIZE + BATCH_LOOKAHEAD)

  if (candidates.length > FINALIZE_BATCH_SIZE + BATCH_LOOKAHEAD) {
    throw new RangeError('Track deletion maintenance repository exceeded the requested limit')
  }

  const progress = await processCandidates(candidates.slice(0, FINALIZE_BATCH_SIZE), repository)

  if (progress.errors.length > 0) {
    throw new AggregateError(progress.errors, 'One or more music track deletions failed')
  }

  return {complete: candidates.length <= FINALIZE_BATCH_SIZE, finalized: progress.finalized}
}
