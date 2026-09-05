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
  updateMemos: vi.fn(),
}))

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
    playDialogue: vi.fn().mockResolvedValue(undefined),
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
    const playDialogue = vi.fn().mockResolvedValue(undefined)
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
      playback: () => playDialogue.mockReturnValueOnce(completion.promise),
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
    playDialogue: vi.fn().mockResolvedValue(undefined),
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
    playDialogue: vi.fn().mockResolvedValue(undefined),
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
    playDialogue: vi.fn().mockResolvedValue(undefined),
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
    playDialogue: vi.fn().mockResolvedValue(undefined),
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
    playDialogue: vi.fn().mockResolvedValue(undefined),
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

it('should discard generated audio when reminder persistence fails', async () => {
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
  mocks.updateMemos.mockRejectedValue(new Error('write failed'))
  const events = {
    playDialogue: vi.fn().mockResolvedValue(undefined),
    refreshDialogues: vi.fn().mockResolvedValue(undefined),
  } as unknown as PEventContextValue
  const view = renderHook(() =>
    useMemoryReminders({events, loadSettings: mocks.loadSettings, random: () => 0}),
  )

  await vi.advanceTimersToNextTimerAsync()
  await flushPromises()

  expect(mocks.deleteDialogue).toHaveBeenCalledWith('memory-memo-memo-1')

  view.cleanup()
})
