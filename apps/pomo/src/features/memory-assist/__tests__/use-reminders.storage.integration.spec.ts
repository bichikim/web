/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import flushPromises from 'flush-promises'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import type {PEventContextValue} from '../../focus-room-dialogue'
import {createMemoryMemo, editMemoryMemo} from '../schedule'
import {updateMemoryMemos} from '../repository'
import {useMemoryReminders} from '../use-reminders'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createRepository: vi.fn(),
  deleteDialogue: vi.fn(),
  initializeClient: vi.fn(),
  retryDeletions: vi.fn(),
}))

vi.mock('../use-deletion-recovery', () => ({useDeletionRecovery: vi.fn()}))
vi.mock('../deletion-runtime', () => ({memoryMemoDeletion: {retry: mocks.retryDeletions}}))
vi.mock('../dialogue', () => ({createMemoryMemoDialogue: vi.fn()}))
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
  localStorage.clear()
  vi.clearAllMocks()
  mocks.createClient.mockReturnValue({
    dispose: vi.fn(),
    initialize: mocks.initializeClient,
  })
  mocks.initializeClient.mockResolvedValue({ok: true, value: undefined})
  mocks.createRepository.mockReturnValue({
    deleteDialogue: mocks.deleteDialogue,
    dispose: vi.fn(),
  })
  mocks.retryDeletions.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.useRealTimers()
  localStorage.clear()
})

it('should not replay a reminder after a persisted edit reaches the reminder hook', async () => {
  const memo = {
    ...createMemoryMemo({
      exactReminderAt: '2026-09-04T03:00:00.000Z',
      id: 'memo-1',
      now: new Date('2026-09-04T02:00:00.000Z'),
      random: () => 0,
      recallMode: 'none',
      text: '메모',
    }),
    dialogueId: 'dialogue-1',
  }
  localStorage.setItem('pomo:memory-memos:v1', JSON.stringify([memo]))

  const playback = Promise.withResolvers<boolean>()
  const events = {
    deleteDialogue: vi.fn(),
    playDialogue: vi.fn().mockReturnValue(playback.promise),
    refreshDialogues: vi.fn().mockResolvedValue(undefined),
  } as unknown as PEventContextValue
  const view = renderHook(() => useMemoryReminders({events, random: () => 0}))

  try {
    await flushPromises()
    await vi.advanceTimersToNextTimerAsync()
    expect(events.playDialogue).toHaveBeenCalledOnce()

    const editPromise = updateMemoryMemos((currentMemos) =>
      currentMemos.map((currentMemo) =>
        editMemoryMemo({
          exactReminderAt: currentMemo.exactReminderAt,
          memo: currentMemo,
          now: new Date('2026-09-04T03:00:01.000Z'),
          random: () => 0,
          recallMode: 'none',
          text: '수정된 메모',
        }),
      ),
    )
    await editPromise

    expect(JSON.parse(localStorage.getItem('pomo:memory-memos:v1') ?? 'null')).toMatchObject([
      {dialogueId: null, text: '수정된 메모'},
    ])

    playback.resolve(true)
    await flushPromises()
    await vi.advanceTimersByTimeAsync(0)

    expect(events.playDialogue).toHaveBeenCalledOnce()
    expect(JSON.parse(localStorage.getItem('pomo:memory-memos:v1') ?? 'null')).toMatchObject([
      {dialogueId: null, text: '수정된 메모'},
    ])
    expect(vi.getTimerCount()).toBe(0)
  } finally {
    view.cleanup()
  }
})

it('should replay a persisted replacement with the same ID without the old retry delay', async () => {
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
  localStorage.setItem('pomo:memory-memos:v1', JSON.stringify([memo]))

  const events = {
    playDialogue: vi.fn().mockResolvedValueOnce(false).mockResolvedValue(true),
    refreshDialogues: vi.fn().mockResolvedValue(undefined),
  } as unknown as PEventContextValue
  const view = renderHook(() => useMemoryReminders({events}))

  try {
    await flushPromises()
    await vi.advanceTimersToNextTimerAsync()
    await flushPromises()
    expect(events.playDialogue).toHaveBeenCalledOnce()

    await updateMemoryMemos(() => [])
    await flushPromises()
    await updateMemoryMemos(() => [replacement])
    await flushPromises()
    await vi.advanceTimersByTimeAsync(1)
    await flushPromises()

    expect(events.playDialogue).toHaveBeenCalledTimes(2)
  } finally {
    view.cleanup()
  }
})

it('should persist an exact delivery before delivering a simultaneously due recall', async () => {
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
  localStorage.setItem('pomo:memory-memos:v1', JSON.stringify([memo]))

  const firstPlayback = Promise.withResolvers<boolean>()
  const events = {
    deleteDialogue: vi.fn(),
    playDialogue: vi.fn().mockReturnValueOnce(firstPlayback.promise).mockResolvedValue(true),
    refreshDialogues: vi.fn().mockResolvedValue(undefined),
  } as unknown as PEventContextValue
  const view = renderHook(() => useMemoryReminders({events, random: () => 0}))

  try {
    await flushPromises()
    await vi.advanceTimersToNextTimerAsync()
    expect(events.playDialogue).toHaveBeenCalledOnce()

    firstPlayback.resolve(true)
    await flushPromises()

    expect(JSON.parse(localStorage.getItem('pomo:memory-memos:v1') ?? 'null')).toMatchObject([
      {
        nextExactReminderAt: null,
        nextRecallAt: dueAt,
        reinforcementIndex: 0,
        reminderEvents: [
          {
            deliveredAt: dueAt,
            kind: 'exact',
            scheduledAt: dueAt,
          },
        ],
      },
    ])

    await vi.advanceTimersByTimeAsync(0)
    await flushPromises()

    expect(events.playDialogue).toHaveBeenCalledTimes(2)
    expect(JSON.parse(localStorage.getItem('pomo:memory-memos:v1') ?? 'null')).toMatchObject([
      {
        nextExactReminderAt: null,
        nextRecallAt: '2026-09-04T11:00:00.000Z',
        reinforcementIndex: 1,
        reminderEvents: [
          {
            deliveredAt: dueAt,
            kind: 'exact',
            scheduledAt: dueAt,
          },
          {
            deliveredAt: dueAt,
            kind: 'recall',
            scheduledAt: dueAt,
          },
        ],
      },
    ])
  } finally {
    view.cleanup()
  }
})
