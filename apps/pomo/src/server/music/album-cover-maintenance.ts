import {createSerialTaskQueue} from 'src/utils/create-serial-task-queue'

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

  const queue = createSerialTaskQueue()
  const results = await Promise.allSettled(
    candidates.slice(0, CLEANUP_BATCH_SIZE).map((candidate) =>
      queue.run(async () => {
        const objectKey = await repository.prepare(candidate.id, now)
        if (objectKey === null) {
          return false
        }
        await repository.deleteStorage(objectKey)
        return repository.finalize(candidate.id)
      }),
    ),
  )
  const errors = results.flatMap((result) => (result.status === 'rejected' ? [result.reason] : []))

  if (errors.length > 0) {
    throw new AggregateError(errors, 'One or more album cover cleanups failed')
  }

  return {
    complete: candidates.length <= CLEANUP_BATCH_SIZE,
    finalized: results.filter((result) => result.status === 'fulfilled' && result.value).length,
  }
}
