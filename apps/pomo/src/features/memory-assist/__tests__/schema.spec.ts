/** @vitest-environment node */
import {expect, it} from 'vitest'

import {parseMemoryMemos} from '../schema'

it('should restore an unconsumed legacy exact reminder with non-repeating defaults', () => {
  const exactReminderAt = '2026-09-04T04:00:00.000Z'
  const result = parseMemoryMemos([
    {
      createdAt: '2026-09-04T03:00:00.000Z',
      dialogueId: null,
      exactReminderAt,
      id: 'memo-1',
      nextRecallAt: null,
      recallMode: 'none',
      reinforcementIndex: 0,
      reminderHistory: ['2026-09-04T03:30:00.000Z'],
      text: '여권 갱신하기',
      updatedAt: '2026-09-04T03:00:00.000Z',
      version: 1,
    },
  ])

  expect(result?.[0]).toMatchObject({
    exactReminderAdvanceMinutes: 0,
    exactReminderAt,
    exactReminderRepeatIntervalMinutes: null,
    exactReminderRepeatUntilMinutes: 0,
    nextExactReminderAt: exactReminderAt,
    reminderEvents: [],
    reminderHistory: ['2026-09-04T03:30:00.000Z'],
    version: 1,
  })
})

it('should disable legacy ongoing recall when an exact reminder is active', () => {
  const result = parseMemoryMemos([
    {
      createdAt: '2026-09-04T03:00:00.000Z',
      dialogueId: null,
      exactReminderAt: '2026-09-04T04:00:00.000Z',
      id: 'memo-1',
      nextRecallAt: '2026-09-04T03:10:00.000Z',
      recallMode: 'reinforcement',
      reinforcementIndex: 2,
      reminderHistory: [],
      text: '여권 갱신하기',
      updatedAt: '2026-09-04T03:00:00.000Z',
      version: 1,
    },
  ])

  expect(result?.[0]).toMatchObject({
    nextRecallAt: null,
    recallMode: 'none',
    reinforcementIndex: 0,
  })
})

it('should preserve a cleared legacy exact reminder after delayed delivery', () => {
  const exactReminderAt = null
  const result = parseMemoryMemos([
    {
      createdAt: '2026-09-04T03:00:00.000Z',
      dialogueId: null,
      exactReminderAt,
      id: 'memo-1',
      nextRecallAt: null,
      recallMode: 'none',
      reinforcementIndex: 0,
      reminderHistory: ['2026-09-04T04:05:00Z'],
      text: '여권 갱신하기',
      updatedAt: '2026-09-04T04:00:00.000Z',
      version: 1,
    },
  ])

  expect(result?.[0]).toMatchObject({
    exactReminderAt,
    nextExactReminderAt: null,
  })
})

it('should preserve an explicitly consumed exact reminder and its delayed delivery event', () => {
  const exactReminderAt = '2026-09-04T04:00:00.000Z'
  const result = parseMemoryMemos([
    {
      createdAt: '2026-09-04T03:00:00.000Z',
      dialogueId: null,
      exactReminderAt,
      id: 'memo-1',
      nextExactReminderAt: null,
      nextRecallAt: null,
      recallMode: 'none',
      reinforcementIndex: 0,
      reminderEvents: [
        {
          deliveredAt: '2026-09-04T04:05:00.000Z',
          kind: 'exact',
          scheduledAt: exactReminderAt,
        },
      ],
      reminderHistory: ['2026-09-04T04:05:00.000Z'],
      text: '여권 갱신하기',
      updatedAt: '2026-09-04T04:05:00.000Z',
      version: 1,
    },
  ])

  expect(result?.[0]).toMatchObject({
    exactReminderAt,
    nextExactReminderAt: null,
    reminderEvents: [
      {
        deliveredAt: '2026-09-04T04:05:00.000Z',
        kind: 'exact',
        scheduledAt: exactReminderAt,
      },
    ],
  })
})

it('should preserve a normalized legacy memo when it is parsed again', () => {
  const result = parseMemoryMemos([
    {
      createdAt: '2026-09-04T03:00:00.000Z',
      dialogueId: null,
      exactReminderAt: null,
      id: 'memo-1',
      nextRecallAt: null,
      recallMode: 'none',
      reinforcementIndex: 0,
      reminderHistory: ['2026-09-04T03:30:00.000Z'],
      text: '여권 갱신하기',
      updatedAt: '2026-09-04T03:30:00.000Z',
      version: 1,
    },
  ])

  expect(result).not.toBeNull()
  expect(parseMemoryMemos(result)).toEqual(result)
})

it('should preserve an exact reminder at its stored advance time', () => {
  const result = parseMemoryMemos([
    {
      createdAt: '2026-09-04T03:00:00.000Z',
      dialogueId: null,
      exactReminderAdvanceMinutes: 30,
      exactReminderAt: '2026-09-04T04:00:00.000Z',
      id: 'memo-1',
      nextExactReminderAt: '2026-09-04T03:30:00.000Z',
      nextRecallAt: null,
      recallMode: 'none',
      reinforcementIndex: 0,
      reminderHistory: [],
      text: '여권 갱신하기',
      updatedAt: '2026-09-04T03:00:00.000Z',
      version: 1,
    },
  ])

  expect(result?.[0]?.nextExactReminderAt).toBe('2026-09-04T03:30:00.000Z')
})

it('should preserve the stored next repeated exact reminder after delayed delivery', () => {
  const result = parseMemoryMemos([
    {
      createdAt: '2026-09-04T03:00:00.000Z',
      dialogueId: null,
      exactReminderAdvanceMinutes: 30,
      exactReminderAt: '2026-09-04T04:00:00.000Z',
      exactReminderRepeatIntervalMinutes: 10,
      exactReminderRepeatUntilMinutes: 20,
      id: 'memo-1',
      nextExactReminderAt: '2026-09-04T03:40:00.000Z',
      nextRecallAt: null,
      recallMode: 'none',
      reinforcementIndex: 0,
      reminderEvents: [
        {
          deliveredAt: '2026-09-04T03:35:00.000Z',
          kind: 'exact',
          scheduledAt: '2026-09-04T03:30:00.000Z',
        },
      ],
      reminderHistory: ['2026-09-04T03:35:00.000Z'],
      text: '여권 갱신하기',
      updatedAt: '2026-09-04T03:35:00.000Z',
      version: 1,
    },
  ])

  expect(result?.[0]?.nextExactReminderAt).toBe('2026-09-04T03:40:00.000Z')
})

it('should not treat a recall event as a consumed exact reminder', () => {
  const exactReminderAt = '2026-09-04T04:00:00.000Z'
  const result = parseMemoryMemos([
    {
      createdAt: '2026-09-04T03:00:00.000Z',
      dialogueId: null,
      exactReminderAt,
      id: 'memo-1',
      nextRecallAt: null,
      recallMode: 'none',
      reinforcementIndex: 0,
      reminderEvents: [
        {
          deliveredAt: exactReminderAt,
          kind: 'recall',
          scheduledAt: exactReminderAt,
        },
      ],
      reminderHistory: [exactReminderAt],
      text: '여권 갱신하기',
      updatedAt: exactReminderAt,
      version: 1,
    },
  ])

  expect(result?.[0]?.nextExactReminderAt).toBe(exactReminderAt)
})

it.each([
  {reminderEvents: undefined},
  {reminderEvents: []},
  {
    reminderEvents: [
      {
        deliveredAt: '2026-09-04T04:00:00.000Z',
        kind: 'exact',
        scheduledAt: '2026-09-04T04:00:00.000Z',
      },
    ],
  },
])('should not infer a missing next reminder from delivery history (%j)', ({reminderEvents}) => {
  const exactReminderAt = '2026-09-04T04:00:00.000Z'
  const result = parseMemoryMemos([
    {
      createdAt: '2026-09-04T03:00:00.000Z',
      dialogueId: null,
      exactReminderAt,
      id: 'memo-1',
      nextRecallAt: null,
      recallMode: 'none',
      reinforcementIndex: 0,
      reminderEvents,
      reminderHistory: [exactReminderAt],
      text: '여권 갱신하기',
      updatedAt: exactReminderAt,
      version: 1,
    },
  ])

  expect(result?.[0]?.nextExactReminderAt).toBe(exactReminderAt)
})
