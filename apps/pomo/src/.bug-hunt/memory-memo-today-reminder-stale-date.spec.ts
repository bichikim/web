/** @vitest-environment node */
import {expect, it} from 'vitest'

import {resolveReminderAt} from '../components/memory-assist/reminder-draft'

/** Mirrors save-time date selection in use-memo-creator and MemoryMemoItem. */
const resolveExactReminderAtOnSave = (
  reminderDay: 'today' | 'tomorrow' | 'custom',
  reminderTime: string,
  now: Date,
  reminderDateReference: Date,
) =>
  resolveReminderAt(
    reminderDay,
    '',
    reminderTime,
    reminderDay === 'tomorrow' ? now : reminderDateReference,
  )

it('should resolve today reminders against save time, not the modal open time', () => {
  const modalOpenedAt = new Date('2026-09-21T23:30:00.000Z')
  const savedAt = new Date('2026-09-22T08:00:00.000Z')

  const resolvedOnSave = resolveExactReminderAtOnSave('today', '09:00', savedAt, modalOpenedAt)
  const expected = resolveReminderAt('today', '', '09:00', savedAt)

  expect(resolvedOnSave).toBe(expected)
})
