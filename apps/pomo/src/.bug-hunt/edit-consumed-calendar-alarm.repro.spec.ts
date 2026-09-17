/** @vitest-environment jsdom */

import {expect, it, vi} from 'vitest'

import {createCalendarAlarmSaver} from '../features/calendar-alarm/create-calendar-alarm-saver'
import {createMemoryMemo, editMemoryMemo} from '../features/memory-assist/schedule'

const exactReminderAt = '2026-09-15T09:00:00.000Z'
const now = new Date('2026-09-12T09:00:00.000Z')
const memoId = 'calendar-alarm:connection-1:event-1'

const consumedAlarm = () => ({
  ...createMemoryMemo({
    exactReminderAt,
    id: memoId,
    now,
    random: () => 0,
    recallMode: 'none',
    text: '팀 회의 일정 알람이에요.',
  }),
  dialogueId: null,
  nextExactReminderAt: null,
  reminderEvents: [
    {
      deliveredAt: '2026-09-15T09:05:00.000Z',
      kind: 'exact' as const,
      scheduledAt: exactReminderAt,
    },
  ],
  reminderHistory: ['2026-09-15T09:05:00.000Z'],
})

it('should rearm a consumed exact calendar alarm when the user saves without changing the schedule', () => {
  const memo = consumedAlarm()

  const saved = editMemoryMemo({
    exactReminderAt,
    memo,
    now,
    random: () => 0,
    recallMode: 'none',
    text: memo.text,
  })

  expect(saved.nextExactReminderAt).toBe(exactReminderAt)
})

it('should rearm a consumed calendar alarm through the calendar save path', async () => {
  let stored = [consumedAlarm()]
  const save = createCalendarAlarmSaver({
    cleanup: vi.fn().mockResolvedValue(undefined),
    reportError: vi.fn(),
    updateMemos: async (update) => {
      stored = update(stored)
      return stored
    },
  })

  await save({
    alarmAt: new Date(exactReminderAt),
    memoId,
    now,
    random: () => 0,
    text: stored[0]!.text,
  })

  expect(stored[0]?.nextExactReminderAt).toBe(exactReminderAt)
})
