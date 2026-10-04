/** @vitest-environment node */
import {expect, it, vi} from 'vitest'

import {
  createFeedSyncController,
  type CreateFeedSyncControllerOptions,
} from '../features/focus-room-feed/sync-controller'

it('should not schedule queued jobs after the controller is disposed mid-sync', async () => {
  let resolveSync!: () => void
  const syncBlocked = new Promise<void>((resolve) => {
    resolveSync = resolve
  })
  const scheduleJobs = vi.fn()
  const options = {
    cleanupExpiredDialogues: vi.fn().mockResolvedValue(undefined),
    createFetcher: vi.fn(),
    createId: () => 'job-id',
    discardMissingConnections: vi.fn().mockResolvedValue(undefined),
    getConnections: () => [
      {
        createdAt: '2026-09-01T00:00:00.000Z',
        id: 'feed',
        updatedAt: '2026-09-01T00:00:00.000Z',
        url: 'https://example.com/feed.xml',
        version: 1 as const,
        voiceId: 'default',
      },
    ],
    getRepository: vi.fn(),
    now: () => new Date('2026-09-12T00:00:00.000Z'),
    reloadIssues: vi.fn().mockResolvedValue(undefined),
    resolveGenerationSettings: vi.fn(),
    scheduleJobs,
    setState: vi.fn(),
    synchronize: vi.fn(async () => {
      await syncBlocked
      return {
        failures: [],
        queuedJobIds: ['queued-job'],
        successfulConnections: 1,
      }
    }),
  } satisfies CreateFeedSyncControllerOptions

  const controller = createFeedSyncController(options)
  const syncPromise = controller.sync()

  await Promise.resolve()
  controller.dispose()
  resolveSync()
  await syncPromise

  expect(scheduleJobs).not.toHaveBeenCalled()
})
