/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {PreferenceProvider} from 'src/hooks/use-preference'
import flushPromises from 'flush-promises'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import type {PEventContextValue} from '../../focus-room-dialogue'
import {MEMORY_MEMOS_CHANGED_EVENT} from '../repository'
import {createMemoryMemo} from '../schedule'
import type {MemoryMemo} from '../schema'
import {useMemoryReminders} from '../use-reminders'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createDialogue: vi.fn(),
  createRepository: vi.fn(),
  initializeClient: vi.fn(),
  readMemos: vi.fn(),
  retryDeletions: vi.fn(),
  updateMemos: vi.fn(),
}))

vi.mock('../use-deletion-recovery', () => ({useDeletionRecovery: vi.fn()}))
vi.mock('../deletion-runtime', () => ({memoryMemoDeletion: {retry: mocks.retryDeletions}}))
vi.mock('../repository', () => ({
  MEMORY_MEMOS_CHANGED_EVENT: 'pomo:memory-memos-changed',
  readMemoryMemos: mocks.readMemos,
  updateMemoryMemos: mocks.updateMemos,
}))
vi.mock('../dialogue', () => ({createMemoryMemoDialogue: mocks.createDialogue}))
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
  mocks.readMemos.mockResolvedValue([])
  mocks.retryDeletions.mockResolvedValue(undefined)
  mocks.updateMemos.mockResolvedValue([])
})

afterEach(() => {
  vi.useRealTimers()
})

it('should clear a scheduled reminder when storage marks its memo pending deletion', async () => {
  const memo: MemoryMemo = {
    ...createMemoryMemo({
      exactReminderAt: '2026-09-04T03:01:00.000Z',
      id: 'memo-1',
      now: new Date('2026-09-04T02:00:00.000Z'),
      random: () => 0,
      recallMode: 'none',
      text: '삭제한 메모',
    }),
    dialogueId: 'existing-dialogue',
  }
  mocks.readMemos.mockResolvedValue([memo])
  const events = {
    playDialogue: vi.fn().mockResolvedValue(true),
    refreshDialogues: vi.fn().mockResolvedValue(undefined),
  } as unknown as PEventContextValue
  const view = renderReminders(() => useMemoryReminders({events}))

  await flushPromises()
  expect(vi.getTimerCount()).toBe(1)

  globalThis.dispatchEvent(
    new CustomEvent(MEMORY_MEMOS_CHANGED_EVENT, {
      detail: {memos: [{...memo, deletionPending: true as const}], revision: 1},
    }),
  )
  await flushPromises()
  await vi.advanceTimersByTimeAsync(60_000)

  expect(vi.getTimerCount()).toBe(0)
  expect(events.refreshDialogues).not.toHaveBeenCalled()
  expect(events.playDialogue).not.toHaveBeenCalled()
  expect(mocks.updateMemos).not.toHaveBeenCalled()

  view.cleanup()
})
