/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {PreferenceProvider} from 'src/hooks/use-preference'
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
  const view = renderReminders(() =>
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
    reminderEvents: [
      {
        deliveredAt: '2026-09-04T03:00:00.000Z',
        kind: 'exact',
        scheduledAt: '2026-09-04T03:00:00.000Z',
      },
    ],
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
  const view = renderReminders(() =>
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
  const view = renderReminders(() =>
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
  const view = renderReminders(() =>
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

it('should not schedule a reminder for a memo pending deletion', async () => {
  mocks.memos = [
    {
      ...createMemoryMemo({
        exactReminderAt: '2026-09-04T03:00:00.000Z',
        id: 'memo-1',
        now: new Date('2026-09-04T02:00:00.000Z'),
        random: () => 0,
        recallMode: 'none',
        text: '삭제한 메모',
      }),
      deletionPending: true as const,
      dialogueId: 'memory-memo-memo-1',
    },
  ]
  const events = {
    playDialogue: vi.fn().mockResolvedValue(true),
    refreshDialogues: vi.fn().mockResolvedValue(undefined),
  } as unknown as PEventContextValue
  const view = renderReminders(() => useMemoryReminders({events}))

  await flushPromises()

  expect(vi.getTimerCount()).toBe(0)
  expect(events.refreshDialogues).not.toHaveBeenCalled()
  expect(events.playDialogue).not.toHaveBeenCalled()
  expect(mocks.updateMemos).not.toHaveBeenCalled()

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
    const view = renderReminders(() =>
      useMemoryReminders({events, loadSettings: mocks.loadSettings, random: () => 0}),
    )

    await vi.advanceTimersToNextTimerAsync()
    await flushPromises()

    expect(mocks.deleteDialogue).toHaveBeenCalledWith('memory-memo-memo-1')

    view.cleanup()
  },
)
