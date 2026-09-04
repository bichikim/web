import {expect, it} from 'vitest'

import {parseMemoryMemos} from '../schema'

it('should restore legacy exact reminders with non-repeating defaults', () => {
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
      reminderHistory: [],
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
