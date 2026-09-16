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

it('should not replay a reminder when its edit is persisted after playback', async () => {
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
  const persistence = Promise.withResolvers<void>()
  mocks.updateMemos.mockImplementation(async (update) => {
    await persistence.promise
    mocks.memos = update(mocks.memos)
    return mocks.memos
  })
  const playDialogue = vi.fn().mockResolvedValue(true)
  const events = {
    playDialogue,
    refreshDialogues: vi.fn().mockResolvedValue(undefined),
  } as unknown as PEventContextValue
  const view = renderHook(() => useMemoryReminders({events}))

  try {
    await vi.advanceTimersToNextTimerAsync()
    await vi.waitFor(() => expect(mocks.updateMemos).toHaveBeenCalledOnce())

    const editedMemo = {
      ...memo,
      text: '수정된 메모',
      updatedAt: '2026-09-04T03:00:01.000Z',
    }
    mocks.memos = [editedMemo]
    persistence.resolve()
    await flushPromises()
    await vi.advanceTimersByTimeAsync(0)

    expect(playDialogue).toHaveBeenCalledOnce()
    expect(mocks.memos).toEqual([editedMemo])
  } finally {
    view.cleanup()
  }
})

it('should preserve a same-timestamp memo edit when reminder persistence is queued', async () => {
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
  const view = renderHook(() => useMemoryReminders({events}))

  try {
    await vi.advanceTimersToNextTimerAsync()
    await vi.waitFor(() => expect(mocks.updateMemos).toHaveBeenCalledOnce())

    const editedMemo = {...memo, dialogueId: null, text: '같은 시각에 수정된 메모'}
    mocks.memos = [editedMemo]
    persistence.resolve()
    await flushPromises()

    expect(mocks.memos).toEqual([editedMemo])
  } finally {
    view.cleanup()
  }
})

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
