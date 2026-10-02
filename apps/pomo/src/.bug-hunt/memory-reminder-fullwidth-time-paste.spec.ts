/** @vitest-environment node */
import {expect, it, vi} from 'vitest'

vi.mock('src/features/memory-assist', () => ({
  MEMORY_REINFORCEMENT_INTERVALS: [600_000],
}))

import {resolveReminderAt} from '../components/memory-assist/reminder-draft'

it('should resolve exact reminder times pasted with fullwidth digits and colon', () => {
  const savedAt = new Date(2026, 1, 1, 0, 30)

  expect(resolveReminderAt('today', '2026-01-31', '０９：０５', savedAt)).toBe(
    new Date(2026, 1, 1, 9, 5).toISOString(),
  )
})
