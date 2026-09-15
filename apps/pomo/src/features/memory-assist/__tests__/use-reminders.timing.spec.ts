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
  expect(view.result.skippedReminders()).toEqual(mocks.memos)

  vi.mocked(events.playDialogue).mockResolvedValue(true)
  await vi.advanceTimersByTimeAsync(299_999)
  expect(events.playDialogue).toHaveBeenCalledOnce()
  await vi.advanceTimersByTimeAsync(1)
  await flushPromises()
  expect(events.playDialogue).toHaveBeenCalledTimes(2)
  expect(view.result.skippedReminders()).toEqual([])

  view.cleanup()
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

it('should retain independent skipped reminders without duplicating retry notices', async () => {
  mocks.memos = ['memo-1', 'memo-2'].map((id) => ({
    ...createMemoryMemo({
      exactReminderAt: '2026-09-04T03:00:00.000Z',
      id,
      now: new Date('2026-09-04T02:00:00.000Z'),
      random: () => 0,
      recallMode: 'none',
      text: id,
    }),
    dialogueId: id,
  }))
  const playDialogue = vi.fn().mockResolvedValue(false)
  const events = {
    playDialogue,
    refreshDialogues: vi.fn(),
  } as unknown as PEventContextValue
  const view = renderHook(() => useMemoryReminders({events}))
  try {
    await vi.advanceTimersByTimeAsync(10)
    expect(view.result.skippedReminders().map((memo) => memo.id)).toEqual(['memo-1', 'memo-2'])
    await vi.advanceTimersByTimeAsync(300_000)
    expect(playDialogue).toHaveBeenCalledTimes(4)
    expect(view.result.skippedReminders().map((memo) => memo.id)).toEqual(['memo-1', 'memo-2'])
    playDialogue.mockImplementation(async (id: string) => id === 'memo-1')
    await vi.advanceTimersByTimeAsync(300_000)
    expect(view.result.skippedReminders().map((memo) => memo.id)).toEqual(['memo-2'])
  } finally {
    view.cleanup()
  }
})
