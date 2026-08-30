import 'server-only'

import {
  type AlbumCoverCleanupCandidate,
  finalizeAlbumCoverDeletion,
  listAlbumCoverCleanupCandidates,
  prepareAlbumCoverDeletion,
} from './album-cover-reservation'
import {deleteAlbumCover} from './cover-upload'

const CLEANUP_BATCH_SIZE = 25
const BATCH_LOOKAHEAD = 1

export interface AlbumCoverMaintenanceRepository {
  readonly deleteStorage: (objectKey: string) => Promise<void>
  readonly finalize: (id: string) => Promise<boolean>
  readonly listCandidates: (
    now: Date,
    limit: number,
  ) => Promise<ReadonlyArray<AlbumCoverCleanupCandidate>>
  readonly prepare: (id: string, now: Date) => Promise<string | null>
}

export interface AlbumCoverMaintenanceResult {
  readonly complete: boolean
  readonly finalized: number
}

interface RunAlbumCoverMaintenanceOptions {
  readonly now?: Date
  readonly repository?: AlbumCoverMaintenanceRepository
}

const createRepository = (): AlbumCoverMaintenanceRepository => ({
  deleteStorage: deleteAlbumCover,
  finalize: finalizeAlbumCoverDeletion,
  listCandidates: listAlbumCoverCleanupCandidates,
  prepare: prepareAlbumCoverDeletion,
})

interface CleanupProgress {
  readonly errors: ReadonlyArray<unknown>
  readonly finalized: number
}

interface ProcessCandidatesOptions {
  readonly candidates: ReadonlyArray<AlbumCoverCleanupCandidate>
  readonly now: Date
  readonly repository: AlbumCoverMaintenanceRepository
}

const processCandidates = async (
  options: ProcessCandidatesOptions,
  index = 0,
  progress: CleanupProgress = {errors: [], finalized: 0},
): Promise<CleanupProgress> => {
  const candidate = options.candidates[index]

  if (candidate === undefined) {
    return progress
  }

  try {
    const objectKey = await options.repository.prepare(candidate.id, options.now)

    if (objectKey === null) {
      return processCandidates(options, index + 1, progress)
    }

    await options.repository.deleteStorage(objectKey)
    const finalized = await options.repository.finalize(candidate.id)
    return processCandidates(options, index + 1, {
      ...progress,
      finalized: progress.finalized + Number(finalized),
    })
  } catch (error: unknown) {
    return processCandidates(options, index + 1, {
      ...progress,
      errors: [...progress.errors, error],
    })
  }
}

/** Reclaims a bounded batch of expired, unclaimed album covers. */
export const runAlbumCoverMaintenance = async (
  options: RunAlbumCoverMaintenanceOptions = {},
): Promise<AlbumCoverMaintenanceResult> => {
  const repository = options.repository ?? createRepository()
  const now = options.now ?? new Date()
  const candidates = await repository.listCandidates(now, CLEANUP_BATCH_SIZE + BATCH_LOOKAHEAD)

  if (candidates.length > CLEANUP_BATCH_SIZE + BATCH_LOOKAHEAD) {
    throw new RangeError('Album cover maintenance repository exceeded the requested limit')
  }

  const progress = await processCandidates({
    candidates: candidates.slice(0, CLEANUP_BATCH_SIZE),
    now,
    repository,
  })

  if (progress.errors.length > 0) {
    throw new AggregateError(progress.errors, 'One or more album cover cleanups failed')
  }

  return {
    complete: candidates.length <= CLEANUP_BATCH_SIZE,
    finalized: progress.finalized,
  }
}
