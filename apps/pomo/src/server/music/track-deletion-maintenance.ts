import {asc, lte} from 'drizzle-orm'

import {getDatabase, musicTrackDeletionJobs, musicTrackRegistrations} from '../database'
import {
  finalizeTrackDeletion,
  markTrackDeletionStorageDeleted,
  prepareTrackDeletion,
} from './track-deletion-repository'
import {deleteTrackAssetStorage} from './track-storage-deletion'

const FINALIZE_BATCH_SIZE = 25
const BATCH_LOOKAHEAD = 1
const MILLISECONDS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60
const MILLISECONDS_PER_HOUR = MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND
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

interface CandidateProgress {
  readonly errors: ReadonlyArray<unknown>
  readonly finalized: number
}

interface RegistrationProgress {
  readonly errors: ReadonlyArray<unknown>
}

interface ProcessRegistrationsOptions {
  readonly candidates: ReadonlyArray<TrackRegistrationCandidate>
  readonly repository: TrackDeletionMaintenanceRepository
  readonly staleBefore: Date
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

const processRegistrations = async (
  options: ProcessRegistrationsOptions,
  index = 0,
  progress: RegistrationProgress = {errors: []},
): Promise<RegistrationProgress> => {
  const candidate = options.candidates[index]

  if (candidate === undefined) {
    return progress
  }

  try {
    await options.repository.prepareStale(candidate.trackId, options.staleBefore)
    return processRegistrations(options, index + 1, progress)
  } catch (error: unknown) {
    return processRegistrations(options, index + 1, {
      errors: [...progress.errors, error],
    })
  }
}

const assertWithinLookahead = (count: number, label: string): void => {
  if (count > FINALIZE_BATCH_SIZE + BATCH_LOOKAHEAD) {
    throw new RangeError(`${label} repository exceeded the requested limit`)
  }
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
  assertWithinLookahead(registrations.length, 'Track registration maintenance')
  const registrationProgress = await processRegistrations({
    candidates: registrations.slice(0, FINALIZE_BATCH_SIZE),
    repository,
    staleBefore,
  })
  const candidates = await repository.listPending(FINALIZE_BATCH_SIZE + BATCH_LOOKAHEAD)
  assertWithinLookahead(candidates.length, 'Track deletion maintenance')
  const progress = await processCandidates(candidates.slice(0, FINALIZE_BATCH_SIZE), repository)
  const errors = [...registrationProgress.errors, ...progress.errors]

  if (errors.length > 0) {
    throw new AggregateError(errors, 'One or more music track deletions failed')
  }

  return {
    complete:
      registrations.length <= FINALIZE_BATCH_SIZE && candidates.length <= FINALIZE_BATCH_SIZE,
    finalized: progress.finalized,
  }
}
