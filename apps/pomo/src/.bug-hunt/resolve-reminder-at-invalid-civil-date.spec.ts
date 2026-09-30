/** @vitest-environment node */
import {expect, it} from 'vitest'

import {parseDate} from '../features/civil-date'
import {resolveReminderAt} from '../components/memory-assist/reminder-draft'

it('should reject reminder dates that are not valid civil dates', () => {
  const now = new Date('2026-03-01T12:00:00')

  expect(parseDate('2026-02-30')).toBeNull()
  expect(resolveReminderAt('custom', '2026-02-30', '09:00', now)).toBeNull()
})
