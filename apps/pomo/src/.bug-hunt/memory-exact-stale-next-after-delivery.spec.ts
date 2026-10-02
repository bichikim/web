/** @vitest-environment node */
import {expect, it} from 'vitest'

import {getDueMemoryReminder} from '../features/memory-assist/schedule'
import {parseMemoryMemos} from '../features/memory-assist/schema'

it('should not refire an exact reminder when reminderEvents already recorded that scheduled occurrence', () => {
  const exactReminderAt = '2026-09-04T04:00:00.000Z'
  const memos = parseMemoryMemos([
    {
      createdAt: '2026-09-04T03:00:00.000Z',
      dialogueId: null,
      exactReminderAt,
      id: 'memo-1',
      nextExactReminderAt: exactReminderAt,
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

  if (memos === null || memos[0] === undefined) {
    throw new Error('Expected the memo to parse.')
  }

  expect(getDueMemoryReminder(memos[0], new Date('2026-09-04T04:10:00.000Z'))).toBeNull()
})
