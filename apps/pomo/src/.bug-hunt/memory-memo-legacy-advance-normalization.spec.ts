/** @vitest-environment node */
import {expect, it} from 'vitest'

import {getDueMemoryReminder} from '../features/memory-assist/schedule'
import {parseMemoryMemos} from '../features/memory-assist/schema'

it('should restore legacy advance time when nextExactReminderAt is missing', () => {
  const memos = parseMemoryMemos([
    {
      createdAt: '2026-09-04T03:00:00.000Z',
      dialogueId: null,
      exactReminderAdvanceMinutes: 30,
      exactReminderAt: '2026-09-04T04:00:00.000Z',
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
  const memo = memos?.[0]
  expect(memo?.nextExactReminderAt).toBe('2026-09-04T03:30:00.000Z')
  expect(getDueMemoryReminder(memo!, new Date('2026-09-04T03:25:00.000Z'))).toBeNull()
  expect(getDueMemoryReminder(memo!, new Date('2026-09-04T03:30:00.000Z'))).toBe('exact')
})
