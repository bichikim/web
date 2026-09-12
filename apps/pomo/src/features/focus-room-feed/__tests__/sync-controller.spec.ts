import {expect, it, vi} from 'vitest'
import {createFeedSyncController, type CreateFeedSyncControllerOptions} from '../sync-controller'
import type {PFeedState} from '../feed-controller'

it.each(['success', 'failure'] as const)(
  'should preserve active generation progress when a refresh reports %s',
  async (outcome) => {
    let state: PFeedState = {message: 'generating', progress: 42, status: 'generating'}
    const setState = vi.fn((value: PFeedState) => {
      state = value
    })
    const options = {
      cleanupExpiredDialogues: vi.fn(),
      createFetcher: vi.fn(),
      createId: () => 'id',
      discardMissingConnections: vi.fn(),
      getConnections: () => [
        {
          id: 'feed',
          createdAt: '',
          url: 'https://example.com/feed',
          updatedAt: '',
          version: 1,
          voiceId: 'default',
        },
      ],
      getRepository: vi.fn(),
      getState: () => state,
      now: () => new Date('2026-09-12T00:00:00Z'),
      reloadIssues: vi.fn(),
      resolveGenerationSettings: vi.fn(),
      scheduleJobs: vi.fn(),
      setState,
      synchronize: vi.fn(async () => ({
        failures: outcome === 'failure' ? [{connectionId: 'feed', message: 'failed'}] : [],
        queuedJobIds: [],
        successfulConnections: 1,
      })),
    } satisfies CreateFeedSyncControllerOptions
    const controller = createFeedSyncController(options)
    await controller.sync()
    expect(options.synchronize).toHaveBeenCalledOnce()
    expect(state).toEqual({message: 'generating', progress: 42, status: 'generating'})
    expect(setState).not.toHaveBeenCalled()
  },
)
