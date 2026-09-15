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

it.each(['edited', 'deleted', 'pending deletion'] as const)(
  'should hide a skipped reminder when its memo is %s',
  async (change) => {
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
    const events = {
      playDialogue: vi.fn().mockResolvedValue(false),
      refreshDialogues: vi.fn(),
    } as unknown as PEventContextValue
    const view = renderHook(() => useMemoryReminders({events}))
    try {
      await vi.advanceTimersToNextTimerAsync()
      expect(view.result.skippedReminders()).toEqual([memo])
      const changes = {
        deleted: [],
        edited: [{...memo, updatedAt: '2026-09-04T03:00:01.000Z'}],
        'pending deletion': [{...memo, deletionPending: true as const}],
      }
      mocks.memos = changes[change]
      expect(view.result.skippedReminders()).toEqual([])
    } finally {
      view.cleanup()
    }
  },
)

it('should not publish a skipped reminder after owner cleanup', async () => {
  mocks.memos = [
    {
      ...createMemoryMemo({
        exactReminderAt: '2026-09-04T03:00:00.000Z',
        id: 'memo-1',
        now: new Date('2026-09-04T02:00:00.000Z'),
        random: () => 0,
        recallMode: 'none',
        text: '메모',
      }),
      dialogueId: 'existing-dialogue',
    },
  ]
  const playback = Promise.withResolvers<boolean>()
  const events = {
    playDialogue: vi.fn().mockReturnValue(playback.promise),
    refreshDialogues: vi.fn(),
  } as unknown as PEventContextValue
  const view = renderHook(() => useMemoryReminders({events}))
  await vi.advanceTimersToNextTimerAsync()
  expect(events.playDialogue).toHaveBeenCalledOnce()
  view.cleanup()
  playback.resolve(false)
  await flushPromises()
  expect(view.result.skippedReminders()).toEqual([])
})
