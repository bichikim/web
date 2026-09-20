import {expect, it, vi} from 'vitest'

import {
  createCalendarAlarmSaver,
  type CalendarAlarmSaveOptions,
} from '../features/calendar-alarm/create-calendar-alarm-saver'
import {createMemoryMemo} from '../features/memory-assist/schedule'
import type {MemoryMemo} from '../features/memory-assist/schema'

const now = new Date('2026-09-12T09:00:00Z')
const alarmAt = new Date('2026-09-15T09:00:00Z')

const legacyMemoId = 'calendar-alarm:connection:abcde12345'
const scopedMemoId = 'calendar-alarm:connection:["work","abcde12345"]'

const legacyMemo: MemoryMemo = {
  ...createMemoryMemo({
    exactReminderAt: alarmAt.toISOString(),
    id: legacyMemoId,
    now,
    random: () => 0,
    recallMode: 'none',
    text: 'Legacy alarm',
  }),
  nextExactReminderAt: alarmAt.toISOString(),
}

it('should retire the legacy calendar alarm memo when saving on the scoped event id', async () => {
  let stored: ReadonlyArray<MemoryMemo> = [legacyMemo]
  const save = createCalendarAlarmSaver({
    cleanup: vi.fn().mockResolvedValue(undefined),
    reportError: vi.fn(),
    updateMemos: async (update) => {
      stored = update(stored)
      return stored
    },
  })

  const options: CalendarAlarmSaveOptions = {
    alarmAt,
    memoId: scopedMemoId,
    now,
    random: () => 0,
    text: 'Scoped alarm',
  }

  await save(options)

  const legacyStillScheduled = stored.some(
    (memo) => memo.id === legacyMemoId && memo.nextExactReminderAt !== null,
  )
  expect(legacyStillScheduled).toBe(false)
})
