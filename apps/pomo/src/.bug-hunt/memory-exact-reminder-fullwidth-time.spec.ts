import {describe, expect, it} from 'vitest'

import {resolveReminderAt} from '../components/memory-assist/reminder-draft'

describe('resolveReminderAt fullwidth time paste', () => {
  const now = new Date(2026, 0, 15, 12, 0)

  it.each([
    {time: '０９:０５', label: 'fullwidth digits'},
    {time: '09：05', label: 'fullwidth colon'},
  ])('should preserve the selected calendar day for $label', ({time}) => {
    expect(resolveReminderAt('custom', '2026-01-20', time, now)).toBe(
      new Date(2026, 0, 20, 9, 5).toISOString(),
    )
  })
})
