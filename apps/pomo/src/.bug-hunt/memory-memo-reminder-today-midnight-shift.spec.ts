/** @vitest-environment node */
import {expect, it, vi} from 'vitest'

vi.mock('../features/memory-assist', () => ({
  MEMORY_REINFORCEMENT_INTERVALS: [600_000],
}))

import {resolveReminderAt} from '../components/memory-assist/reminder-draft'

it('should keep the calendar day chosen as today when saving after midnight', () => {
  const savedAt = new Date('2026-02-01T00:30:00.000Z')

  expect(resolveReminderAt('today', '2026-01-31', '23:45', savedAt)).toBe(
    '2026-01-31T23:45:00.000Z',
  )
})
