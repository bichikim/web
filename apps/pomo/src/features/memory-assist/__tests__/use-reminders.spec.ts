/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import flushPromises from 'flush-promises'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import type {PEventContextValue} from '../../focus-room-dialogue'
import {createMemoryMemo} from '../schedule'
import type {MemoryMemo} from '../schema'
import {useMemoryReminders} from '../use-reminders'
import {useDeletionRecovery} from '../use-deletion-recovery'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createDialogue: vi.fn(),
  createRepository: vi.fn(),
  deleteDialogue: vi.fn(),
  initializeClient: vi.fn(),
  loadSettings: vi.fn(),
  memos: [] as ReadonlyArray<MemoryMemo>,
  retryDeletions: vi.fn(),
  updateMemos: vi.fn(),
}))

vi.mock('../use-deletion-recovery', () => ({useDeletionRecovery: vi.fn()}))
vi.mock('../deletion-runtime', () => ({memoryMemoDeletion: {retry: mocks.retryDeletions}}))
vi.mock('../use-memos', () => ({useMemoryMemos: () => () => mocks.memos}))
vi.mock('../dialogue', () => ({createMemoryMemoDialogue: mocks.createDialogue}))
vi.mock('../repository', () => ({updateMemoryMemos: mocks.updateMemos}))
vi.mock('../../focus-room-dialogue', () => ({
  createPDialogueRepository: mocks.createRepository,
}))
vi.mock('../../supertonic', () => ({
  createSupertonicClient: mocks.createClient,
  getSupertonicErrorMessage: () => 'voice failed',
}))

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-09-04T03:00:00.000Z'))
  vi.clearAllMocks()
  mocks.retryDeletions.mockResolvedValue(undefined)
  mocks.createClient.mockReturnValue({
    dispose: vi.fn(),
    initialize: mocks.initializeClient,
  })
  mocks.initializeClient.mockResolvedValue({ok: true, value: undefined})
  mocks.loadSettings.mockResolvedValue({modelId: 'int8', version: 1, voiceId: 'Yuna'})
  mocks.createRepository.mockReturnValue({
    deleteDialogue: mocks.deleteDialogue,
    dispose: vi.fn(),
  })
  mocks.deleteDialogue.mockResolvedValue(undefined)
  mocks.createDialogue.mockResolvedValue('memory-memo-memo-1')
  mocks.updateMemos.mockImplementation(async (update) => {
    mocks.memos = update(mocks.memos)
    return mocks.memos
  })
})

afterEach(() => {
  vi.useRealTimers()
})

it('should generate, store, and play a due memo reminder', async () => {
  mocks.memos = [
    createMemoryMemo({
      exactReminderAt: '2026-09-04T03:00:00.000Z',
      id: 'memo-1',
      now: new Date('2026-09-04T02:00:00.000Z'),
      random: () => 0,
      recallMode: 'none',
      text: '여권 갱신하기',
    }),
  ]
  const events = {
    playDialogue: vi.fn().mockResolvedValue(true),
    refreshDialogues: vi.fn().mockResolvedValue(undefined),
  } as unknown as PEventContextValue
  const view = renderHook(() =>
    useMemoryReminders({events, loadSettings: mocks.loadSettings, random: () => 0}),
  )

  await vi.runOnlyPendingTimersAsync()
  await flushPromises()

  expect(mocks.createDialogue).toHaveBeenCalledWith(
    expect.objectContaining({memo: expect.objectContaining({id: 'memo-1'})}),
  )
  expect(events.refreshDialogues).toHaveBeenCalledOnce()
  expect(events.playDialogue).toHaveBeenCalledWith('memory-memo-memo-1')
  expect(mocks.memos[0]).toMatchObject({
    dialogueId: 'memory-memo-memo-1',
    exactReminderAt: null,
    reminderHistory: ['2026-09-04T03:00:00.000Z'],
  })

  view.cleanup()
})

it('should run the playback callback before playing a due memo reminder', async () => {
  mocks.memos = [
    createMemoryMemo({
      exactReminderAt: '2026-09-04T03:00:00.000Z',
      id: 'memo-1',
      now: new Date('2026-09-04T02:00:00.000Z'),
      random: () => 0,
      recallMode: 'none',
      text: '여권 갱신하기',
    }),
  ]
  const playbackOrder: string[] = []
  const events = {
    playDialogue: vi.fn(async () => {
      playbackOrder.push('play')
      return true
    }),
    refreshDialogues: vi.fn().mockResolvedValue(undefined),
  } as unknown as PEventContextValue
  const view = renderHook(() =>
    useMemoryReminders({
      events,
      loadSettings: mocks.loadSettings,
      onBeforePlayback: () => playbackOrder.push('before'),
      random: () => 0,
    }),
  )

  await vi.runOnlyPendingTimersAsync()
  await flushPromises()

  expect(playbackOrder).toEqual(['before', 'play'])

  view.cleanup()
})

it.each([
  ['model preparation', '2026-09-04T03:35:00.000Z', '2026-09-04T03:40:00.000Z'],
  ['generation', '2026-09-04T03:35:00.000Z', '2026-09-04T03:40:00.000Z'],
  ['refresh', '2026-09-04T03:35:00.000Z', '2026-09-04T03:40:00.000Z'],
  ['playback', '2026-09-04T03:35:00.000Z', '2026-09-04T03:40:00.000Z'],
  ['playback', '2026-09-04T03:40:00.000Z', '2026-09-04T03:50:00.000Z'],
  ['playback', '2026-09-04T05:05:00.000Z', null],
] as const)(
  'should skip elapsed repeats when %s completes at %s',
  async (stage, completedAt, nextReminderAt) => {
    mocks.memos = [
      createMemoryMemo({
        exactReminderAdvanceMinutes: 60,
        exactReminderAt: '2026-09-04T04:00:00.000Z',
        exactReminderRepeatIntervalMinutes: 10,
        exactReminderRepeatUntilMinutes: 60,
        id: 'memo-1',
        now: new Date('2026-09-04T02:00:00.000Z'),
        random: () => 0,
        recallMode: 'none',
        text: '여권 갱신하기',
      }),
    ]
    const completion = Promise.withResolvers<void>()
    const playDialogue = vi.fn().mockResolvedValue(true)
    const refreshDialogues = vi.fn().mockResolvedValue(undefined)
    const stages = {
      generation: () =>
        mocks.createDialogue.mockImplementationOnce(async () => {
          await completion.promise
          return 'memory-memo-memo-1'
        }),
      'model preparation': () =>
        mocks.initializeClient.mockImplementationOnce(async () => {
          await completion.promise
          return {ok: true, value: undefined}
        }),
      playback: () => playDialogue.mockReturnValueOnce(completion.promise.then(() => true)),
      refresh: () => refreshDialogues.mockReturnValueOnce(completion.promise),
    }
    stages[stage]()
    const events = {playDialogue, refreshDialogues} as unknown as PEventContextValue
    const view = renderHook(() =>
      useMemoryReminders({events, loadSettings: mocks.loadSettings, random: () => 0}),
    )

    try {
      await vi.advanceTimersToNextTimerAsync()
      await flushPromises()
      expect(mocks.updateMemos).not.toHaveBeenCalled()

      vi.setSystemTime(new Date(completedAt))
      completion.resolve()
      await flushPromises()

      expect(mocks.memos[0]).toMatchObject({
        exactReminderAt: nextReminderAt === null ? null : '2026-09-04T04:00:00.000Z',
        nextExactReminderAt: nextReminderAt,
        reminderHistory: [completedAt],
        updatedAt: completedAt,
      })
      await vi.advanceTimersByTimeAsync(1)
      expect(playDialogue).toHaveBeenCalledExactlyOnceWith('memory-memo-memo-1')
      expect(mocks.updateMemos).toHaveBeenCalledOnce()
      expect(vi.getTimerCount()).toBe(nextReminderAt === null ? 0 : 1)

      if (nextReminderAt !== null) {
        await vi.advanceTimersToNextTimerAsync()
        await flushPromises()
        expect(new Date().toISOString()).toBe(nextReminderAt)
        expect(playDialogue).toHaveBeenCalledTimes(2)
        expect(mocks.createDialogue).toHaveBeenCalledOnce()
      }
    } finally {
      view.cleanup()
    }
  },
)

it('should use the automatic dialogue model and voice for generated memo audio', async () => {
  mocks.memos = [
    createMemoryMemo({
      exactReminderAt: '2026-09-04T03:00:00.000Z',
      id: 'memo-1',
      now: new Date('2026-09-04T02:00:00.000Z'),
      random: () => 0,
      recallMode: 'none',
      text: '여권 갱신하기',
    }),
  ]
  const events = {
    playDialogue: vi.fn().mockResolvedValue(true),
    refreshDialogues: vi.fn().mockResolvedValue(undefined),
  } as unknown as PEventContextValue
  const view = renderHook(() =>
    useMemoryReminders({
      events,
      loadSettings: async () => ({modelId: 'int8', version: 1, voiceId: 'M2'}),
      random: () => 0,
    }),
  )

  await vi.runOnlyPendingTimersAsync()
  await flushPromises()

  expect(mocks.initializeClient).toHaveBeenCalledWith(expect.objectContaining({modelId: 'int8'}))
  expect(mocks.createDialogue).toHaveBeenCalledWith(
    expect.objectContaining({modelId: 'int8', voiceId: 'M2'}),
  )

  view.cleanup()
})

it('should reuse compressed dialogue audio for a later recall', async () => {
  mocks.memos = [
    {
      ...createMemoryMemo({
        exactReminderAt: null,
        id: 'memo-1',
        now: new Date('2026-09-04T02:50:00.000Z'),
        random: () => 0,
        recallMode: 'random',
        text: '여권 갱신하기',
      }),
      dialogueId: 'memory-memo-memo-1',
    },
  ]
  const events = {
    playDialogue: vi.fn().mockResolvedValue(true),
    refreshDialogues: vi.fn().mockResolvedValue(undefined),
  } as unknown as PEventContextValue
  const view = renderHook(() =>
    useMemoryReminders({events, loadSettings: mocks.loadSettings, random: () => 0}),
  )

  await vi.runOnlyPendingTimersAsync()
  await flushPromises()

  expect(mocks.createDialogue).not.toHaveBeenCalled()
  expect(mocks.createClient).not.toHaveBeenCalled()
  expect(events.playDialogue).toHaveBeenCalledWith('memory-memo-memo-1')
  expect(mocks.memos[0]?.nextRecallAt).toBe('2026-09-04T03:10:00.000Z')

  view.cleanup()
})

it('should discard generated audio when its memo is deleted during generation', async () => {
  mocks.memos = [
    createMemoryMemo({
      exactReminderAt: '2026-09-04T03:00:00.000Z',
      id: 'memo-1',
      now: new Date('2026-09-04T02:00:00.000Z'),
      random: () => 0,
      recallMode: 'none',
      text: '여권 갱신하기',
    }),
  ]
  const generation = Promise.withResolvers<string>()
  mocks.createDialogue.mockReturnValue(generation.promise)
  const events = {
    playDialogue: vi.fn().mockResolvedValue(true),
    refreshDialogues: vi.fn().mockResolvedValue(undefined),
  } as unknown as PEventContextValue
  const view = renderHook(() =>
    useMemoryReminders({events, loadSettings: mocks.loadSettings, random: () => 0}),
  )

  await vi.advanceTimersToNextTimerAsync()
  await vi.waitFor(() => expect(mocks.createDialogue).toHaveBeenCalledOnce())
  mocks.memos = []
  generation.resolve('memory-memo-memo-1')
  await flushPromises()

  expect(mocks.deleteDialogue).toHaveBeenCalledWith('memory-memo-memo-1')
  expect(events.refreshDialogues).not.toHaveBeenCalled()
  expect(events.playDialogue).not.toHaveBeenCalled()
  expect(mocks.updateMemos).not.toHaveBeenCalled()

  view.cleanup()
})

it('should discard generated audio when its memo is edited during generation', async () => {
  mocks.memos = [
    createMemoryMemo({
      exactReminderAt: '2026-09-04T03:00:00.000Z',
      id: 'memo-1',
      now: new Date('2026-09-04T02:00:00.000Z'),
      random: () => 0,
      recallMode: 'none',
      text: '여권 갱신하기',
    }),
  ]
  const generation = Promise.withResolvers<string>()
  mocks.createDialogue.mockReturnValue(generation.promise)
  const events = {
    playDialogue: vi.fn().mockResolvedValue(true),
    refreshDialogues: vi.fn().mockResolvedValue(undefined),
  } as unknown as PEventContextValue
  const view = renderHook(() =>
    useMemoryReminders({events, loadSettings: mocks.loadSettings, random: () => 0}),
  )

  await vi.advanceTimersToNextTimerAsync()
  await vi.waitFor(() => expect(mocks.createDialogue).toHaveBeenCalledOnce())
  mocks.memos = [
    {
      ...mocks.memos[0]!,
      text: '여권과 사진 갱신하기',
      updatedAt: '2026-09-04T03:00:01.000Z',
    },
  ]
  generation.resolve('memory-memo-memo-1')
  await flushPromises()

  expect(mocks.deleteDialogue).toHaveBeenCalledWith('memory-memo-memo-1')
  expect(events.refreshDialogues).not.toHaveBeenCalled()
  expect(events.playDialogue).not.toHaveBeenCalled()
  expect(mocks.updateMemos).not.toHaveBeenCalled()

  view.cleanup()
})

it('should preserve an edit made while reminder persistence is waiting', async () => {
  mocks.memos = [
    createMemoryMemo({
      exactReminderAt: '2026-09-04T03:00:00.000Z',
      id: 'memo-1',
      now: new Date('2026-09-04T02:00:00.000Z'),
      random: () => 0,
      recallMode: 'none',
      text: '여권 갱신하기',
    }),
  ]
  const persistence = Promise.withResolvers<void>()
  mocks.updateMemos.mockImplementation(async (update) => {
    await persistence.promise
    mocks.memos = update(mocks.memos)
    return mocks.memos
  })
  const events = {
    playDialogue: vi.fn().mockResolvedValue(true),
    refreshDialogues: vi.fn().mockResolvedValue(undefined),
  } as unknown as PEventContextValue
  const view = renderHook(() =>
    useMemoryReminders({events, loadSettings: mocks.loadSettings, random: () => 0}),
  )

  await vi.advanceTimersToNextTimerAsync()
  await vi.waitFor(() => expect(mocks.updateMemos).toHaveBeenCalledOnce())
  const editedMemo = {
    ...mocks.memos[0]!,
    text: '여권과 사진 갱신하기',
    updatedAt: '2026-09-04T03:00:01.000Z',
  }
  mocks.memos = [editedMemo]
  persistence.resolve()
  await flushPromises()

  expect(mocks.memos).toEqual([editedMemo])
  expect(mocks.deleteDialogue).toHaveBeenCalledWith('memory-memo-memo-1')

  view.cleanup()
})

it.each(['persistence', 'refresh', 'playback'] as const)(
  'should discard generated audio when %s fails',
  async (stage) => {
    mocks.memos = [
      createMemoryMemo({
        exactReminderAt: '2026-09-04T03:00:00.000Z',
        id: 'memo-1',
        now: new Date('2026-09-04T02:00:00.000Z'),
        random: () => 0,
        recallMode: 'none',
        text: '여권 갱신하기',
      }),
    ]
    const failure = vi.fn().mockRejectedValue(new Error('delivery failed'))
    const events = {
      playDialogue: vi.fn().mockResolvedValue(true),
      refreshDialogues: vi.fn().mockResolvedValue(undefined),
    } as unknown as PEventContextValue
    const failures = {
      persistence: mocks.updateMemos,
      playback: vi.mocked(events.playDialogue),
      refresh: vi.mocked(events.refreshDialogues),
    }
    failures[stage].mockImplementation(failure)
    const view = renderHook(() =>
      useMemoryReminders({events, loadSettings: mocks.loadSettings, random: () => 0}),
    )

    await vi.advanceTimersToNextTimerAsync()
    await flushPromises()

    expect(mocks.deleteDialogue).toHaveBeenCalledWith('memory-memo-memo-1')

    view.cleanup()
  },
)

it('should not resurrect a deleted memo when reminder persistence was already queued', async () => {
  const memo = {
    ...createMemoryMemo({
      exactReminderAt: '2026-09-04T03:00:00.000Z',
      id: 'memo-1',
      now: new Date('2026-09-04T02:00:00.000Z'),
      random: () => 0,
      recallMode: 'none',
      text: '메모',
    }),
    dialogueId: 'memory-memo-memo-1',
  }
  mocks.memos = [memo]
  mocks.updateMemos.mockImplementation(async (update) => {
    mocks.memos = update([{...memo, deletionPending: true}])
    return mocks.memos
  })
  const events = {
    playDialogue: vi.fn().mockResolvedValue(true),
    refreshDialogues: vi.fn().mockResolvedValue(undefined),
  } as unknown as PEventContextValue
  const view = renderHook(() => useMemoryReminders({events}))
  await vi.advanceTimersToNextTimerAsync()
  await flushPromises()
  expect(mocks.memos).toEqual([{...memo, deletionPending: true}])
  view.cleanup()
})

it('should discard generated audio when the reminder owner is disposed during generation', async () => {
  mocks.memos = [
    createMemoryMemo({
      exactReminderAt: '2026-09-04T03:00:00.000Z',
      id: 'memo-1',
      now: new Date('2026-09-04T02:00:00.000Z'),
      random: () => 0,
      recallMode: 'none',
      text: '여권 갱신하기',
    }),
  ]
  const generation = Promise.withResolvers<string>()
  mocks.createDialogue.mockReturnValue(generation.promise)
  const events = {
    playDialogue: vi.fn().mockResolvedValue(true),
    refreshDialogues: vi.fn().mockResolvedValue(undefined),
  } as unknown as PEventContextValue
  const view = renderHook(() =>
    useMemoryReminders({events, loadSettings: mocks.loadSettings, random: () => 0}),
  )

  await vi.advanceTimersToNextTimerAsync()
  await vi.waitFor(() => expect(mocks.createDialogue).toHaveBeenCalledOnce())
  const repository = mocks.createRepository.mock.results[0].value
  view.cleanup()
  expect(repository.dispose).not.toHaveBeenCalled()
  generation.resolve('memory-memo-memo-1')
  await flushPromises()

  expect(mocks.deleteDialogue).toHaveBeenCalledWith('memory-memo-memo-1')
  expect(events.refreshDialogues).not.toHaveBeenCalled()
  expect(events.playDialogue).not.toHaveBeenCalled()
  expect(mocks.updateMemos).not.toHaveBeenCalled()
  expect(repository.dispose).toHaveBeenCalledOnce()
})

it('should not advance a reminder when playback is skipped', async () => {
  mocks.memos = [
    createMemoryMemo({
      exactReminderAt: '2026-09-04T03:00:00.000Z',
      id: 'memo-1',
      now: new Date('2026-09-04T02:00:00.000Z'),
      random: () => 0,
      recallMode: 'none',
      text: '여권 갱신하기',
    }),
  ]
  const events = {
    playDialogue: vi.fn().mockResolvedValue(false),
    refreshDialogues: vi.fn().mockResolvedValue(undefined),
  } as unknown as PEventContextValue
  const view = renderHook(() =>
    useMemoryReminders({events, loadSettings: mocks.loadSettings, random: () => 0}),
  )

  await vi.runOnlyPendingTimersAsync()
  await flushPromises()

  expect(mocks.deleteDialogue).toHaveBeenCalledWith('memory-memo-memo-1')
  expect(mocks.memos[0]).toMatchObject({
    exactReminderAt: '2026-09-04T03:00:00.000Z',
    reminderHistory: [],
  })
  expect(mocks.updateMemos).not.toHaveBeenCalled()

  view.cleanup()
})

it('should bind recovery to the shared runtime controller and current dialogue events', async () => {
  mocks.memos = []
  const events = {deleteDialogue: vi.fn()} as unknown as PEventContextValue
  const view = renderHook(() => useMemoryReminders({events}))
  const retry = vi.mocked(useDeletionRecovery).mock.calls[0]![0]
  await retry()
  expect(mocks.retryDeletions).toHaveBeenCalledExactlyOnceWith(events.deleteDialogue)
  view.cleanup()
})

it('should dispose a client initialized after owner cleanup without generating audio', async () => {
  mocks.memos = [
    createMemoryMemo({
      exactReminderAt: '2026-09-04T03:00:00.000Z',
      id: 'memo-1',
      now: new Date('2026-09-04T02:00:00.000Z'),
      random: () => 0,
      recallMode: 'none',
      text: '여권 갱신하기',
    }),
  ]
  const initialization = Promise.withResolvers<{ok: true; value: undefined}>()
  mocks.initializeClient.mockReturnValue(initialization.promise)
  const events = {
    playDialogue: vi.fn().mockResolvedValue(true),
    refreshDialogues: vi.fn(),
  } as unknown as PEventContextValue
  const view = renderHook(() => useMemoryReminders({events, loadSettings: mocks.loadSettings}))
  await vi.advanceTimersToNextTimerAsync()
  expect(mocks.initializeClient).toHaveBeenCalledOnce()
  const client = mocks.createClient.mock.results[0].value
  view.cleanup()
  expect(client.dispose).toHaveBeenCalledOnce()
  initialization.resolve({ok: true, value: undefined})
  await flushPromises()
  expect(mocks.createDialogue).not.toHaveBeenCalled()
  expect(client.dispose).toHaveBeenCalledOnce()
  expect(mocks.updateMemos).not.toHaveBeenCalled()
})

it('should delay retry after skipped playback instead of regenerating immediately', async () => {
  mocks.memos = [
    createMemoryMemo({
      exactReminderAt: '2026-09-04T03:00:00.000Z',
      id: 'memo-1',
      now: new Date('2026-09-04T02:00:00.000Z'),
      random: () => 0,
      recallMode: 'none',
      text: '여권 갱신하기',
    }),
  ]
  const events = {
    playDialogue: vi.fn().mockResolvedValue(false),
    refreshDialogues: vi.fn(),
  } as unknown as PEventContextValue
  const view = renderHook(() => useMemoryReminders({events, loadSettings: mocks.loadSettings}))
  await vi.advanceTimersToNextTimerAsync()
  await flushPromises()
  await vi.advanceTimersByTimeAsync(100)
  expect(events.playDialogue).toHaveBeenCalledOnce()
  expect(mocks.createDialogue).toHaveBeenCalledOnce()
  view.cleanup()
})
