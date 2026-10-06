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

it.each(['synchronize', 'onSynchronized'] as const)(
  'should stop scheduling and publishing after disposal during %s',
  async (stage) => {
    let release!: () => void
    let started!: () => void
    const blocked = new Promise<void>((resolve) => {
      release = resolve
    })
    const entered = new Promise<void>((resolve) => {
      started = resolve
    })
    const summary = {failures: [], queuedJobIds: ['job'], successfulConnections: 1}
    const options = {
      autoPrepare: () => stage !== 'onSynchronized',
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
          version: 1 as const,
          voiceId: 'default',
        },
      ],
      getRepository: vi.fn(),
      now: () => new Date('2026-09-12T00:00:00Z'),
      onSynchronized: vi.fn(async () => {
        started()
        await blocked
      }),
      reloadIssues: vi.fn(),
      resolveGenerationSettings: vi.fn(),
      scheduleJobs: vi.fn(),
      setState: vi.fn(),
      synchronize: vi.fn(async () => {
        if (stage === 'synchronize') {
          started()
          await blocked
        }
        return summary
      }),
    } satisfies CreateFeedSyncControllerOptions
    const controller = createFeedSyncController(options)
    const pending = controller.sync()
    await entered
    controller.dispose()
    options.setState.mockClear()
    release()
    await pending
    expect(options.scheduleJobs).not.toHaveBeenCalled()
    expect(options.setState).not.toHaveBeenCalled()
  },
)
