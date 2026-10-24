/** @vitest-environment node */
import {afterEach, describe, expect, it, vi} from 'vitest'
import type {AiArtifactRecord} from 'src/server/repositories/ai-jobs'
import {
  type AiArtifactServiceRepository,
  type AiArtifactServiceStorage,
  createAiArtifactService,
} from '../service-artifacts'

const now = new Date('2026-09-20T00:00:00.000Z')
afterEach(() => vi.restoreAllMocks())

const diagnosticCases = (['delete', 'cleanup'] as const).flatMap((operation) =>
  (['detail', 'empty', 'plain'] as const).map((cause) => ({cause, operation})),
)

const createArtifact = (index: number): AiArtifactRecord => ({
  archivePendingAt: null,
  contentType: 'text/plain',
  createdAt: now,
  deleteAttempts: 0,
  deletedAt: null,
  durationMs: null,
  expiresAt: now,
  id: `artifact-${index}`,
  jobId: `019d0000-0000-7000-8000-${String(index).padStart(12, '0')}`,
  lastDeleteError: null,
  lifecycle: 'temporary',
  objectKey: `object-${index}`,
  pendingObjectKey: null,
  retentionClass: 'unsaved_result',
  savedAt: null,
  sizeBytes: 100,
  sourceObjectKey: null,
  userId: 'user',
})

const createRepository = () => ({
  claimAiJobArtifactArchiveCleanup:
    vi.fn<AiArtifactServiceRepository['claimAiJobArtifactArchiveCleanup']>(),
  claimAiJobArtifactDeletion: vi.fn<AiArtifactServiceRepository['claimAiJobArtifactDeletion']>(),
  clearAiJobArtifactArchiveCleanup:
    vi.fn<AiArtifactServiceRepository['clearAiJobArtifactArchiveCleanup']>(),
  clearAiJobArtifactPendingArchive:
    vi.fn<AiArtifactServiceRepository['clearAiJobArtifactPendingArchive']>(),
  clearAiJobArtifactSourceObjectKey:
    vi.fn<AiArtifactServiceRepository['clearAiJobArtifactSourceObjectKey']>(),
  findAiJobArtifactForUser: vi.fn<AiArtifactServiceRepository['findAiJobArtifactForUser']>(),
  listAiJobsWithExpiredIntermediateArtifacts: vi
    .fn<AiArtifactServiceRepository['listAiJobsWithExpiredIntermediateArtifacts']>()
    .mockResolvedValue([]),
  listExpiredAiArtifacts: vi
    .fn<AiArtifactServiceRepository['listExpiredAiArtifacts']>()
    .mockResolvedValue([]),
  markAiJobArtifactDeleted: vi.fn<AiArtifactServiceRepository['markAiJobArtifactDeleted']>(),
  markAiJobIntermediateCleanupCompleted: vi
    .fn<AiArtifactServiceRepository['markAiJobIntermediateCleanupCompleted']>()
    .mockResolvedValue(true),
  prepareAiJobArtifactArchive: vi.fn<AiArtifactServiceRepository['prepareAiJobArtifactArchive']>(),
  purgeExpiredAiCostLedger: vi.fn<AiArtifactServiceRepository['purgeExpiredAiCostLedger']>(),
  recordAiJobArtifactDeleteFailure: vi
    .fn<AiArtifactServiceRepository['recordAiJobArtifactDeleteFailure']>()
    .mockResolvedValue(null),
  saveAiJobArtifact: vi.fn<AiArtifactServiceRepository['saveAiJobArtifact']>(),
})

const createStorage = () => ({
  copyAiArtifactObject: vi.fn<AiArtifactServiceStorage['copyAiArtifactObject']>(),
  deleteAiArtifactObject: vi
    .fn<AiArtifactServiceStorage['deleteAiArtifactObject']>()
    .mockResolvedValue(undefined),
  listAiArtifactIntermediateObjectKeys: vi
    .fn<AiArtifactServiceStorage['listAiArtifactIntermediateObjectKeys']>()
    .mockResolvedValue([]),
  listAiArtifactTemporaryObjectKeys: vi
    .fn<AiArtifactServiceStorage['listAiArtifactTemporaryObjectKeys']>()
    .mockResolvedValue([]),
})

describe('createAiArtifactService', () => {
  it.each(diagnosticCases)(
    'should preserve the diagnostic and artifact guards for $operation / $cause',
    async ({operation, cause}) => {
      const pending = {...createArtifact(0), lifecycle: 'deletion_pending' as const}
      const repository = createRepository()
      const storage = createStorage()
      let messageReads = 0
      const message = cause === 'empty' ? '' : 'storage detail'
      const error = Object.defineProperty(cause === 'plain' ? {} : new Error(message), 'message', {
        get: () => {
          messageReads += 1
          if (cause === 'plain') {
            throw new Error('A plain-object message must not be read')
          }
          return message
        },
      })
      repository.findAiJobArtifactForUser.mockResolvedValue(pending)
      repository.claimAiJobArtifactDeletion.mockResolvedValue(pending)
      repository.listExpiredAiArtifacts.mockResolvedValue([pending])
      repository.recordAiJobArtifactDeleteFailure.mockResolvedValue(pending)
      storage.deleteAiArtifactObject.mockRejectedValue(error)
      const service = createAiArtifactService({clock: () => now, repository, storage})

      if (operation === 'delete') {
        await expect(
          service.deleteAiJobArtifactForUser(pending.jobId, pending.userId),
        ).resolves.toBe(pending)
      } else {
        await expect(service.cleanupExpiredAiArtifacts()).resolves.toEqual({
          deleted: 0,
          failures: 1,
        })
      }

      expect(repository.recordAiJobArtifactDeleteFailure).toHaveBeenCalledWith(
        pending.id,
        cause === 'plain' ? 'AI artifact deletion failed' : message,
        {
          expectedLifecycle: pending.lifecycle,
          expectedObjectKey: pending.objectKey,
          expectedPendingObjectKey: pending.pendingObjectKey,
          expectedSourceObjectKey: pending.sourceObjectKey,
          ...(operation === 'cleanup' ? {preserveLifecycle: false} : {}),
        },
      )
      expect(messageReads).toBe(cause === 'plain' ? 0 : 1)
      expect(repository.markAiJobArtifactDeleted).not.toHaveBeenCalled()
      expect(storage.deleteAiArtifactObject).toHaveBeenCalledExactlyOnceWith(pending.objectKey)
    },
  )

  it.each(['artifacts', 'intermediate'] as const)(
    'should keep eight-item batch barriers, failures and final partial batch for %s cleanup',
    async (kind) => {
      const artifacts = Object.freeze(Array.from({length: 17}, (_, index) => createArtifact(index)))
      const keys = artifacts.map((artifact) => artifact.objectKey)
      const gates = artifacts.map(() => Promise.withResolvers<void>())
      const firstEntered = Promise.withResolvers<void>()
      const firstSettled = Promise.withResolvers<void>()
      const secondEntered = Promise.withResolvers<void>()
      const finalEntered = Promise.withResolvers<void>()
      const started: string[] = []
      let settled = 0
      const repository = createRepository()
      const storage = createStorage()
      if (kind === 'artifacts') {
        repository.listExpiredAiArtifacts.mockResolvedValue(artifacts)
      } else {
        repository.listAiJobsWithExpiredIntermediateArtifacts.mockResolvedValue(
          artifacts.map((artifact) => ({id: artifact.jobId, status: 'succeeded'})),
        )
        storage.listAiArtifactIntermediateObjectKeys.mockImplementation(async (prefix) => {
          const artifact = artifacts.find((entry) => prefix.endsWith(entry.jobId))!
          return [artifact.objectKey]
        })
      }
      storage.deleteAiArtifactObject.mockImplementation(async (key) => {
        started.push(key)
        if (started.length === 8) {
          firstEntered.resolve()
        }
        if (started.length === 16) {
          secondEntered.resolve()
        }
        if (started.length === 17) {
          finalEntered.resolve()
        }
        try {
          await gates[keys.indexOf(key)].promise
        } finally {
          settled += 1
          if (settled === 7) {
            firstSettled.resolve()
          }
        }
      })
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const service = createAiArtifactService({clock: () => now, repository, storage})
      const cleanup =
        kind === 'artifacts'
          ? service.cleanupExpiredAiArtifacts()
          : service.cleanupExpiredAiIntermediateObjects()

      await firstEntered.promise
      expect(started).toEqual(keys.slice(0, 8))
      gates.slice(0, 7).forEach((gate) => gate.resolve())
      await firstSettled.promise
      expect(started).toHaveLength(8)
      gates[7].reject(new Error('storage unavailable'))
      await secondEntered.promise
      expect(started).toEqual(keys.slice(0, 16))
      gates[9].reject(new Error('storage unavailable'))
      gates.slice(8, 16).forEach((gate, index) => {
        if (index !== 1) {
          gate.resolve()
        }
      })
      await finalEntered.promise
      expect(started).toEqual(keys)
      gates[16].resolve()

      await expect(cleanup).resolves.toEqual({deleted: 15, failures: 2})
      const completed =
        kind === 'artifacts'
          ? repository.markAiJobArtifactDeleted
          : repository.markAiJobIntermediateCleanupCompleted
      expect(completed.mock.calls.map(([id]) => id)).toEqual(
        artifacts
          .filter((_, index) => index !== 7 && index !== 9)
          .map((artifact) => (kind === 'artifacts' ? artifact.id : artifact.jobId)),
      )
      expect(storage.deleteAiArtifactObject).toHaveBeenCalledTimes(17)
    },
  )

  it('should return zero counts without storage operations for empty cleanup lists', async () => {
    const repository = createRepository()
    const storage = createStorage()
    const service = createAiArtifactService({clock: () => now, repository, storage})
    await expect(service.cleanupExpiredAiArtifacts()).resolves.toEqual({deleted: 0, failures: 0})
    await expect(service.cleanupExpiredAiIntermediateObjects()).resolves.toEqual({
      deleted: 0,
      failures: 0,
    })
    expect(storage.deleteAiArtifactObject).not.toHaveBeenCalled()
    expect(storage.listAiArtifactIntermediateObjectKeys).not.toHaveBeenCalled()
    expect(storage.listAiArtifactTemporaryObjectKeys).not.toHaveBeenCalled()
  })

  it('should sum only completed intermediate cleanups with different object counts', async () => {
    const artifacts = Array.from({length: 3}, (_, index) => createArtifact(index))
    const repository = createRepository()
    const storage = createStorage()
    const error = new Error('partial deletion failed')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    repository.listAiJobsWithExpiredIntermediateArtifacts.mockResolvedValue([
      {id: artifacts[0].jobId, status: 'succeeded'},
      {id: artifacts[1].jobId, status: 'failed'},
      {id: artifacts[2].jobId, status: 'cancelled'},
    ])
    storage.listAiArtifactIntermediateObjectKeys.mockImplementation(async (prefix) => {
      if (prefix.endsWith(artifacts[1].jobId)) {
        return ['intermediate-1', 'intermediate-2']
      }
      return prefix.endsWith(artifacts[2].jobId) ? ['partial-1', 'partial-2'] : []
    })
    storage.listAiArtifactTemporaryObjectKeys.mockImplementation(async (id) =>
      id === artifacts[1].jobId ? ['temporary-1'] : [],
    )
    storage.deleteAiArtifactObject.mockImplementation(async (key) => {
      if (key === 'partial-2') {
        throw error
      }
    })
    const service = createAiArtifactService({clock: () => now, repository, storage})

    await expect(service.cleanupExpiredAiIntermediateObjects()).resolves.toEqual({
      deleted: 3,
      failures: 1,
    })

    expect(repository.markAiJobIntermediateCleanupCompleted.mock.calls.map(([id]) => id)).toEqual([
      artifacts[0].jobId,
      artifacts[1].jobId,
    ])
    expect(storage.deleteAiArtifactObject).toHaveBeenCalledTimes(5)
    expect(storage.listAiArtifactTemporaryObjectKeys.mock.calls.map(([id]) => id)).toEqual([
      artifacts[1].jobId,
      artifacts[2].jobId,
    ])
    expect(consoleError.mock.calls).toEqual([
      ['Failed to process an AI artifact cleanup item', error],
    ])
  })
})
