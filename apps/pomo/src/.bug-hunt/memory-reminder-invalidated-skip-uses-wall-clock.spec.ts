/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {PreferenceProvider} from 'src/hooks/use-preference'
import flushPromises from 'flush-promises'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import type {PEventContextValue} from '../features/focus-room-dialogue'
import {createMemoryMemo} from '../features/memory-assist/schedule'
import type {MemoryMemo} from '../features/memory-assist/schema'
import {useMemoryReminders} from '../features/memory-assist/use-reminders'

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

vi.mock('../features/memory-assist/use-deletion-recovery', () => ({useDeletionRecovery: vi.fn()}))
vi.mock('../features/memory-assist/deletion-runtime', () => ({
  memoryMemoDeletion: {retry: mocks.retryDeletions},
}))
vi.mock('../features/memory-assist/use-memos', () => ({useMemoryMemos: () => () => mocks.memos}))
vi.mock('../features/memory-assist/dialogue', () => ({createMemoryMemoDialogue: mocks.createDialogue}))
vi.mock('../features/memory-assist/repository', () => ({updateMemoryMemos: mocks.updateMemos}))
vi.mock('../features/focus-room-dialogue', () => ({
  createPDialogueRepository: mocks.createRepository,
}))
vi.mock('../features/supertonic', () => ({
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

it('should advance the invalidated repeat from the due instant, not from when playback finishes', async () => {
  const memo = {
    ...createMemoryMemo({
      exactReminderAt: '2026-09-04T03:00:00.000Z',
      exactReminderRepeatIntervalMinutes: 10,
      exactReminderRepeatUntilMinutes: 60,
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
  const events = {
    playDialogue: vi.fn().mockReturnValue(playback.promise),
    refreshDialogues: vi.fn().mockResolvedValue(undefined),
  } as unknown as PEventContextValue
  const view = renderReminders(() => useMemoryReminders({events, random: () => 0}))

  try {
    await vi.advanceTimersToNextTimerAsync()
    expect(events.playDialogue).toHaveBeenCalledOnce()

    mocks.memos = [{...memo, updatedAt: '2026-09-04T03:00:01.000Z'}]
    await vi.advanceTimersByTimeAsync(25 * 60_000)
    playback.resolve(true)
    await flushPromises()
    await vi.advanceTimersByTimeAsync(0)

    expect(mocks.updateMemos).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(10 * 60_000)
    await flushPromises()

    expect(mocks.memos[0]?.nextExactReminderAt).toBe('2026-09-04T03:20:00.000Z')
  } finally {
    view.cleanup()
  }
})
