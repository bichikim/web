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
          createdAt: '',
          id: 'feed',
          updatedAt: '',
          url: 'https://example.com/feed',
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

it.each(['generating', 'preparing'] as const)(
  'should show subscription guidance when sync runs during %s without subscriptions',
  async (status) => {
    let state: PFeedState = {message: 'active', progress: 42, status}
    const setState = vi.fn((value: PFeedState) => {
      state = value
    })
    const options = {
      cleanupExpiredDialogues: vi.fn(),
      createFetcher: vi.fn(),
      createId: () => 'id',
      discardMissingConnections: vi.fn(),
      getConnections: () => [],
      getRepository: vi.fn(),
      getState: () => state,
      now: () => new Date('2026-09-12T00:00:00Z'),
      reloadIssues: vi.fn(),
      resolveGenerationSettings: vi.fn(),
      scheduleJobs: vi.fn(),
      setState,
      synchronize: vi.fn(),
    } satisfies CreateFeedSyncControllerOptions
    const controller = createFeedSyncController(options)

    await controller.sync()

    expect(state).toEqual({
      message: '설정에서 구독 피드를 추가해 주세요.',
      status: 'idle',
    })
    expect(setState).toHaveBeenCalledOnce()
    expect(options.synchronize).not.toHaveBeenCalled()
  },
)
