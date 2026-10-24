/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {PreferenceProvider} from 'src/hooks/use-preference'
import flushPromises from 'flush-promises'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import type {PEventContextValue} from '../../focus-room-dialogue'
import {createMemoryMemo, editMemoryMemo} from '../schedule'
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

const renderReminders = <Value>(callback: () => Value) =>
  renderHook(callback, {wrapper: PreferenceProvider})

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

it('should delay a skipped invalidated repeat before retrying it', async () => {
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
  const view = renderReminders(() => useMemoryReminders({events, random: () => 0}))

  try {
    await vi.advanceTimersToNextTimerAsync()
    expect(playDialogue).toHaveBeenCalledOnce()

    const firstEdit = {...memo, updatedAt: '2026-09-04T03:00:01.000Z'}
    mocks.memos = [firstEdit]
    firstPlayback.resolve(true)
    await flushPromises()

    await vi.advanceTimersByTimeAsync(10 * 60_000)
    expect(playDialogue).toHaveBeenCalledTimes(2)

    mocks.memos = [{...firstEdit, updatedAt: '2026-09-04T03:10:01.000Z'}]
    secondPlayback.resolve(false)
    await flushPromises()

    await vi.advanceTimersByTimeAsync(5 * 60_000 - 1)
    expect(playDialogue).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(1)
    await flushPromises()
    expect(playDialogue).toHaveBeenCalledTimes(3)
  } finally {
    view.cleanup()
  }
})

it('should retry at an edited reminder time instead of retaining the old backoff', async () => {
  const memo = {
    ...createMemoryMemo({
      exactReminderAt: '2026-09-04T03:00:00.000Z',
      id: 'memo-1',
      now: new Date('2026-09-04T02:00:00.000Z'),
      random: () => 0,
      recallMode: 'none',
      text: '여권 갱신하기',
    }),
    dialogueId: 'existing-dialogue',
  }
  mocks.memos = [memo]
  const playDialogue = vi.fn().mockResolvedValueOnce(false).mockResolvedValue(true)
  const events = {
    playDialogue,
    refreshDialogues: vi.fn().mockResolvedValue(undefined),
  } as unknown as PEventContextValue
  const view = renderReminders(() => useMemoryReminders({events}))

  try {
    await vi.advanceTimersToNextTimerAsync()
    expect(playDialogue).toHaveBeenCalledOnce()

    const editedMemo = editMemoryMemo({
      exactReminderAt: '2026-09-04T03:01:00.000Z',
      memo,
      now: new Date('2026-09-04T03:00:01.000Z'),
      random: () => 0,
      recallMode: 'none',
      text: memo.text,
    })
    mocks.memos = [editedMemo]
    document.dispatchEvent(new Event('visibilitychange'))

    await vi.advanceTimersByTimeAsync(59_999)
    expect(playDialogue).toHaveBeenCalledOnce()
    await vi.advanceTimersByTimeAsync(1)
    await flushPromises()

    expect(playDialogue).toHaveBeenCalledTimes(2)
  } finally {
    view.cleanup()
  }
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
  const view = renderReminders(() =>
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

it('should expose a skipped reminder and retry after playback throws', async () => {
  const memo = {
    ...createMemoryMemo({
      exactReminderAt: '2026-09-04T03:00:00.000Z',
      id: 'memo-1',
      now: new Date('2026-09-04T02:00:00.000Z'),
      random: () => 0,
      recallMode: 'none',
      text: '메모',
    }),
    dialogueId: 'existing-dialogue',
  }
  mocks.memos = [memo]
  const playDialogue = vi
    .fn()
    .mockRejectedValueOnce(new Error('playback failed'))
    .mockResolvedValue(true)
  const events = {
    playDialogue,
    refreshDialogues: vi.fn().mockResolvedValue(undefined),
  } as unknown as PEventContextValue
  const view = renderReminders(() => useMemoryReminders({events}))

  try {
    await vi.advanceTimersToNextTimerAsync()
    await flushPromises()

    expect(view.result.skippedReminders()).toEqual([memo])

    await vi.advanceTimersByTimeAsync(5 * 60_000 - 1)
    expect(playDialogue).toHaveBeenCalledOnce()
    await vi.advanceTimersByTimeAsync(1)
    await flushPromises()

    expect(playDialogue).toHaveBeenCalledTimes(2)
    expect(view.result.skippedReminders()).toEqual([])
  } finally {
    view.cleanup()
  }
})

it('should clear retry delay when a skipped memo is replaced after removal with the same ID', async () => {
  const memo = {
    ...createMemoryMemo({
      exactReminderAt: '2026-09-04T03:00:00.000Z',
      id: 'memo-1',
      now: new Date('2026-09-04T02:00:00.000Z'),
      random: () => 0,
      recallMode: 'none',
      text: '기존 메모',
    }),
    dialogueId: 'existing-dialogue',
  }
  const replacement = {
    ...memo,
    text: '교체된 메모',
    updatedAt: '2026-09-04T03:00:01.000Z',
  }
  mocks.memos = [memo]
  const playDialogue = vi.fn().mockResolvedValueOnce(false).mockResolvedValue(true)
  const events = {
    playDialogue,
    refreshDialogues: vi.fn().mockResolvedValue(undefined),
  } as unknown as PEventContextValue
  const view = renderReminders(() => useMemoryReminders({events}))

  try {
    await vi.advanceTimersToNextTimerAsync()
    await flushPromises()
    expect(playDialogue).toHaveBeenCalledOnce()

    vi.setSystemTime(new Date('2026-09-04T03:00:01.000Z'))
    mocks.memos = []
    Object.defineProperty(document, 'visibilityState', {configurable: true, value: 'visible'})
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.advanceTimersByTimeAsync(0)
    await flushPromises()

    mocks.memos = [replacement]
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.advanceTimersByTimeAsync(1)
    await flushPromises()

    expect(playDialogue).toHaveBeenCalledTimes(2)
  } finally {
    view.cleanup()
  }
})

it('should clear retry delay when a removed memo is replaced during playback with the same ID', async () => {
  const memo = {
    ...createMemoryMemo({
      exactReminderAt: '2026-09-04T03:00:00.000Z',
      id: 'memo-1',
      now: new Date('2026-09-04T02:00:00.000Z'),
      random: () => 0,
      recallMode: 'none',
      text: '기존 메모',
    }),
    dialogueId: 'existing-dialogue',
  }
  const replacement = {
    ...memo,
    text: '교체된 메모',
    updatedAt: '2026-09-04T03:00:01.000Z',
  }
  mocks.memos = [memo]
  const playback = Promise.withResolvers<boolean>()
  const playDialogue = vi.fn().mockReturnValueOnce(playback.promise).mockResolvedValue(true)
  const events = {
    playDialogue,
    refreshDialogues: vi.fn().mockResolvedValue(undefined),
  } as unknown as PEventContextValue
  const view = renderReminders(() => useMemoryReminders({events}))

  try {
    await vi.advanceTimersToNextTimerAsync()
    expect(playDialogue).toHaveBeenCalledOnce()

    mocks.memos = []
    Object.defineProperty(document, 'visibilityState', {configurable: true, value: 'visible'})
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.advanceTimersByTimeAsync(0)
    await flushPromises()

    mocks.memos = [replacement]
    document.dispatchEvent(new Event('visibilitychange'))
    await vi.advanceTimersByTimeAsync(0)
    await flushPromises()

    playback.resolve(false)
    await flushPromises()
    await vi.advanceTimersByTimeAsync(1)
    await flushPromises()

    expect(playDialogue).toHaveBeenCalledTimes(2)
  } finally {
    view.cleanup()
  }
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
  const view = renderReminders(() => useMemoryReminders({events, loadSettings: mocks.loadSettings}))
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
  const view = renderReminders(() => useMemoryReminders({events}))
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
