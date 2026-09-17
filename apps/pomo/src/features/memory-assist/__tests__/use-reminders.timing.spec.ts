/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import flushPromises from 'flush-promises'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import type {PEventContextValue} from '../../focus-room-dialogue'
import {createMemoryMemo} from '../schedule'
import type {MemoryMemo} from '../schema'
import {useMemoryReminders} from '../use-reminders'

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
        reminderEvents: [
          {
            deliveredAt: completedAt,
            kind: 'exact',
            scheduledAt: '2026-09-04T03:00:00.000Z',
          },
        ],
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

it('should continue an exact repeat after invalidating an edited playback occurrence', async () => {
  const memo = {
    ...createMemoryMemo({
      exactReminderAt: '2026-09-04T03:00:00.000Z',
      exactReminderRepeatIntervalMinutes: 10,
      exactReminderRepeatUntilMinutes: 20,
      id: 'memo-1',
      now: new Date('2026-09-04T02:00:00.000Z'),
      random: () => 0,
      recallMode: 'none',
      text: '메모',
    }),
    dialogueId: 'existing-dialogue',
  }
  mocks.memos = [memo]
  const playback = Promise.withResolvers<boolean>()
  const playDialogue = vi.fn().mockReturnValue(playback.promise)
  const events = {
    playDialogue,
    refreshDialogues: vi.fn().mockResolvedValue(undefined),
  } as unknown as PEventContextValue
  const view = renderHook(() => useMemoryReminders({events, random: () => 0}))

  try {
    await vi.advanceTimersToNextTimerAsync()
    expect(playDialogue).toHaveBeenCalledOnce()

    const editedMemo = {...memo, updatedAt: '2026-09-04T03:00:01.000Z'}
    mocks.memos = [editedMemo]
    playback.resolve(true)
    await flushPromises()

    await vi.advanceTimersByTimeAsync(10 * 60_000)
    await flushPromises()

    expect(playDialogue).toHaveBeenCalledTimes(2)
    expect(mocks.memos[0]?.nextExactReminderAt).toBe('2026-09-04T03:20:00.000Z')
  } finally {
    view.cleanup()
  }
})

it('should retain an invalidated occurrence across later edits to the same schedule', async () => {
  const memo = {
    ...createMemoryMemo({
      exactReminderAt: '2026-09-04T03:00:00.000Z',
      exactReminderRepeatIntervalMinutes: 10,
      exactReminderRepeatUntilMinutes: 20,
      id: 'memo-1',
      now: new Date('2026-09-04T02:00:00.000Z'),
      random: () => 0,
      recallMode: 'none',
      text: '메모',
    }),
    dialogueId: 'existing-dialogue',
  }
  mocks.memos = [memo]
  const playback = Promise.withResolvers<boolean>()
  const playDialogue = vi.fn().mockReturnValue(playback.promise)
  const events = {
    playDialogue,
    refreshDialogues: vi.fn().mockResolvedValue(undefined),
  } as unknown as PEventContextValue
  const view = renderHook(() => useMemoryReminders({events, random: () => 0}))

  try {
    await vi.advanceTimersToNextTimerAsync()
    expect(playDialogue).toHaveBeenCalledOnce()

    const firstEdit = {...memo, updatedAt: '2026-09-04T03:00:01.000Z'}
    mocks.memos = [firstEdit]
    playback.resolve(true)
    await flushPromises()

    const secondEdit = {
      ...firstEdit,
      text: '두 번째 수정',
      updatedAt: '2026-09-04T03:00:02.000Z',
    }
    mocks.memos = [secondEdit]
    Object.defineProperty(document, 'visibilityState', {configurable: true, value: 'visible'})
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.advanceTimersByTimeAsync(0)

    expect(playDialogue).toHaveBeenCalledOnce()
    await vi.advanceTimersByTimeAsync(10 * 60_000)
    await flushPromises()

    expect(playDialogue).toHaveBeenCalledTimes(2)
    expect(mocks.memos[0]?.nextExactReminderAt).toBe('2026-09-04T03:20:00.000Z')
  } finally {
    view.cleanup()
  }
})

it('should advance a later invalidated occurrence after editing during its playback', async () => {
  const memo = {
    ...createMemoryMemo({
      exactReminderAt: '2026-09-04T03:00:00.000Z',
      exactReminderRepeatIntervalMinutes: 10,
      exactReminderRepeatUntilMinutes: 30,
      id: 'memo-1',
      now: new Date('2026-09-04T02:00:00.000Z'),
      random: () => 0,
      recallMode: 'none',
      text: '메모',
    }),
    dialogueId: 'existing-dialogue',
  }
  mocks.memos = [memo]
  const firstPlayback = Promise.withResolvers<boolean>()
  const secondPlayback = Promise.withResolvers<boolean>()
  const playDialogue = vi
    .fn()
    .mockReturnValueOnce(firstPlayback.promise)
    .mockReturnValueOnce(secondPlayback.promise)
    .mockResolvedValue(true)
  const events = {
    playDialogue,
    refreshDialogues: vi.fn().mockResolvedValue(undefined),
  } as unknown as PEventContextValue
  const view = renderHook(() => useMemoryReminders({events, random: () => 0}))

  try {
    await vi.advanceTimersToNextTimerAsync()
    expect(playDialogue).toHaveBeenCalledOnce()

    const firstEdit = {...memo, updatedAt: '2026-09-04T03:00:01.000Z'}
    mocks.memos = [firstEdit]
    firstPlayback.resolve(true)
    await flushPromises()

    await vi.advanceTimersByTimeAsync(10 * 60_000)
    expect(playDialogue).toHaveBeenCalledTimes(2)

    mocks.memos = [
      {
        ...firstEdit,
        dialogueId: null,
        text: '반복 중 수정된 메모',
        updatedAt: '2026-09-04T03:10:01.000Z',
      },
    ]
    secondPlayback.resolve(true)
    await flushPromises()
    await vi.advanceTimersByTimeAsync(0)

    expect(playDialogue).toHaveBeenCalledTimes(2)
    expect(vi.getTimerCount()).toBe(1)
    await vi.advanceTimersByTimeAsync(10 * 60_000)
    await flushPromises()
    await vi.waitFor(() => expect(playDialogue).toHaveBeenCalledTimes(3))
  } finally {
    view.cleanup()
  }
})

it('should discard an invalidated occurrence when its schedule is edited', async () => {
  const memo = {
    ...createMemoryMemo({
      exactReminderAt: '2026-09-04T03:00:00.000Z',
      exactReminderRepeatIntervalMinutes: 10,
      exactReminderRepeatUntilMinutes: 20,
      id: 'memo-1',
      now: new Date('2026-09-04T02:00:00.000Z'),
      random: () => 0,
      recallMode: 'none',
      text: '메모',
    }),
    dialogueId: 'existing-dialogue',
  }
  mocks.memos = [memo]
  const playback = Promise.withResolvers<boolean>()
  const playDialogue = vi.fn().mockReturnValueOnce(playback.promise).mockResolvedValue(true)
  const events = {
    playDialogue,
    refreshDialogues: vi.fn().mockResolvedValue(undefined),
  } as unknown as PEventContextValue
  const view = renderHook(() => useMemoryReminders({events, random: () => 0}))

  try {
    await vi.advanceTimersToNextTimerAsync()
    expect(playDialogue).toHaveBeenCalledOnce()

    const firstEdit = {...memo, updatedAt: '2026-09-04T03:00:01.000Z'}
    mocks.memos = [firstEdit]
    playback.resolve(true)
    await flushPromises()

    const scheduleEdit = {
      ...firstEdit,
      exactReminderRepeatIntervalMinutes: 20,
      updatedAt: '2026-09-04T03:00:02.000Z',
    }
    mocks.memos = [scheduleEdit]
    Object.defineProperty(document, 'visibilityState', {configurable: true, value: 'visible'})
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.advanceTimersByTimeAsync(0)
    await flushPromises()

    expect(playDialogue).toHaveBeenCalledTimes(2)
    expect(mocks.memos[0]?.nextExactReminderAt).toBe('2026-09-04T03:20:00.000Z')
  } finally {
    view.cleanup()
  }
})

it('should keep a simultaneously due recall pending when exact playback is skipped', async () => {
  const dueAt = '2026-09-04T03:00:00.000Z'
  mocks.memos = [
    {
      ...createMemoryMemo({
        exactReminderAt: null,
        id: 'memo-1',
        now: new Date('2026-09-04T02:50:00.000Z'),
        random: () => 0,
        recallMode: 'reinforcement',
        text: '메모',
      }),
      dialogueId: 'dialogue-1',
      nextExactReminderAt: dueAt,
      nextRecallAt: dueAt,
    },
  ]
  const events = {
    playDialogue: vi.fn().mockResolvedValue(false),
    refreshDialogues: vi.fn().mockResolvedValue(undefined),
  } as unknown as PEventContextValue
  const view = renderHook(() => useMemoryReminders({events}))

  try {
    await vi.advanceTimersToNextTimerAsync()
    await flushPromises()

    expect(events.playDialogue).toHaveBeenCalledOnce()
    expect(mocks.updateMemos).not.toHaveBeenCalled()
    expect(mocks.memos[0]).toMatchObject({
      nextExactReminderAt: dueAt,
      nextRecallAt: dueAt,
      reinforcementIndex: 0,
      reminderEvents: [],
      reminderHistory: [],
    })
  } finally {
    view.cleanup()
  }
})

it('should deliver a simultaneously due recall when exact playback is invalidated', async () => {
  const dueAt = '2026-09-04T03:00:00.000Z'
  const memo = {
    ...createMemoryMemo({
      exactReminderAt: null,
      id: 'memo-1',
      now: new Date('2026-09-04T02:50:00.000Z'),
      random: () => 0,
      recallMode: 'reinforcement',
      text: '메모',
    }),
    dialogueId: 'dialogue-1',
    nextExactReminderAt: dueAt,
    nextRecallAt: dueAt,
  }
  mocks.memos = [memo]
  const firstPlayback = Promise.withResolvers<boolean>()
  const playDialogue = vi.fn().mockReturnValueOnce(firstPlayback.promise).mockResolvedValue(true)
  const events = {
    playDialogue,
    refreshDialogues: vi.fn().mockResolvedValue(undefined),
  } as unknown as PEventContextValue
  const view = renderHook(() => useMemoryReminders({events}))

  try {
    await vi.advanceTimersToNextTimerAsync()
    expect(playDialogue).toHaveBeenCalledOnce()

    mocks.memos = [{...memo, updatedAt: '2026-09-04T03:00:01.000Z'}]
    firstPlayback.resolve(true)
    await flushPromises()
    await vi.advanceTimersByTimeAsync(0)
    await flushPromises()

    expect(playDialogue).toHaveBeenCalledTimes(2)
    expect(mocks.updateMemos).toHaveBeenCalledOnce()
    expect(mocks.memos[0]).toMatchObject({
      nextExactReminderAt: null,
      nextRecallAt: '2026-09-04T11:00:00.000Z',
      reinforcementIndex: 1,
      reminderEvents: [
        {
          deliveredAt: dueAt,
          kind: 'recall',
          scheduledAt: dueAt,
        },
      ],
      reminderHistory: [dueAt],
      updatedAt: dueAt,
    })
  } finally {
    view.cleanup()
  }
})
