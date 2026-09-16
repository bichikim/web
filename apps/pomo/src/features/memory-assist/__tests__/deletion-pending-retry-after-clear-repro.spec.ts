/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import flushPromises from 'flush-promises'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import type {PEventContextValue} from '../../focus-room-dialogue'
import {createMemoryMemo} from '../schedule'
import {useMemoryReminders} from '../use-reminders'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createDialogue: vi.fn(),
  createRepository: vi.fn(),
  deleteDialogue: vi.fn(),
  initializeClient: vi.fn(),
  loadSettings: vi.fn(),
  memos: [] as ReturnType<typeof createMemoryMemo>[],
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

it('should clear retryAfter when a memo id disappears so a replacement can deliver immediately', async () => {
  const memo = {
    ...createMemoryMemo({
      exactReminderAt: '2026-09-04T03:00:00.000Z',
      id: 'memo-1',
      now: new Date('2026-09-04T02:00:00.000Z'),
      random: () => 0,
      recallMode: 'none',
      text: '삭제한 메모',
    }),
    dialogueId: 'existing-dialogue',
  }
  mocks.memos = [memo]
  const events = {
    playDialogue: vi.fn().mockResolvedValue(false),
    refreshDialogues: vi.fn().mockResolvedValue(undefined),
  } as unknown as PEventContextValue
  const view = renderHook(() => useMemoryReminders({events}))

  await vi.advanceTimersToNextTimerAsync()
  await flushPromises()

  expect(events.playDialogue).toHaveBeenCalledOnce()

  mocks.memos = []
  await flushPromises()

  vi.setSystemTime(new Date('2026-09-04T03:00:01.000Z'))
  mocks.memos = [
    {
      ...memo,
      text: '다시 만든 메모',
      updatedAt: '2026-09-04T03:00:01.000Z',
    },
  ]
  await flushPromises()
  await vi.advanceTimersByTimeAsync(1_000)
  await flushPromises()

  expect(events.playDialogue).toHaveBeenCalledTimes(2)

  view.cleanup()
})
