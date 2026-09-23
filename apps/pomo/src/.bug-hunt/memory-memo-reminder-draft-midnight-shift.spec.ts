/** @vitest-environment node */
import {expect, it, vi} from 'vitest'

import {createReminderDraft, resolveReminderAt} from '../components/memory-assist/reminder-draft'

it('should keep the same calendar day when saving a today reminder after midnight', () => {
  vi.useFakeTimers()
  const openedAt = new Date(2026, 0, 31, 23, 0, 0)
  const intendedReminder = new Date(2026, 0, 31, 23, 45, 0)
  vi.setSystemTime(openedAt)

  const draft = createReminderDraft({
    exactReminderAt: intendedReminder.toISOString(),
    now: openedAt,
    recallMode: 'none',
  })

  expect(draft.reminderDay).toBe('today')
  expect(draft.reminderTime).toBe('23:45')

  const savedAt = new Date(2026, 1, 1, 0, 30, 0)
  vi.setSystemTime(savedAt)

  const resolved = resolveReminderAt(
    draft.reminderDay,
    draft.customDate,
    draft.reminderTime,
    savedAt,
  )

  expect(resolved).toBe(intendedReminder.toISOString())

  vi.useRealTimers()
})
