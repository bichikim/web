/** @vitest-environment node */
import {expect, it} from 'vitest'

import {getDueMemoryReminder, parseMemoryMemos} from '../index'

it('should not refire a consumed exact reminder from legacy storage', () => {
  const exactReminderAt = '2026-09-04T04:00:00.000Z'
  const memos = parseMemoryMemos([
    {
      createdAt: '2026-09-04T03:00:00.000Z',
      dialogueId: null,
      exactReminderAt,
      id: 'memo-1',
      nextRecallAt: null,
      recallMode: 'none',
      reinforcementIndex: 0,
      reminderHistory: [exactReminderAt],
      text: '여권 갱신하기',
      updatedAt: exactReminderAt,
      version: 1,
    },
  ])

  if (memos === null || memos[0] === undefined) {
    throw new Error('Expected the legacy memo to parse.')
  }

  expect(getDueMemoryReminder(memos[0], new Date('2026-09-04T04:05:00.000Z'))).toBeNull()
})
