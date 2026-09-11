import {describe, expect, it} from 'vitest'
import {createReminderDraft, getDateInputValue, resolveReminderAt} from '../reminder-draft'

describe('reminder draft dates', () => {
  it('should resolve tomorrow across a local year boundary without changing now', () => {
    const now = new Date(2026, 11, 31, 23, 59, 45)
    const timestamp = now.getTime()
    expect(resolveReminderAt('tomorrow', '', '09:05', now)).toBe(
      new Date(2027, 0, 1, 9, 5).toISOString(),
    )
    expect(now.getTime()).toBe(timestamp)
    expect(getDateInputValue(now)).toBe('2026-12-31')
  })
  it('should classify leap day as tomorrow and preserve the selected minute', () => {
    const draft = createReminderDraft({
      exactReminderAt: new Date(2024, 1, 29, 9, 5).toISOString(),
      now: new Date(2024, 1, 28, 20),
      recallMode: 'none',
    })
    expect(draft.reminderDay).toBe('tomorrow')
    expect(draft.customDate).toBe('2024-02-29')
    expect(draft.reminderTime).toBe('09:05')
  })
  it('should discard seconds when preparing the default reminder', () => {
    const now = new Date(2026, 8, 11, 12, 0, 59)
    const earlier = new Date(2026, 8, 11, 12, 0, 0)
    const create = (date: Date) =>
      createReminderDraft({exactReminderAt: null, now: date, recallMode: 'none'})
    expect(create(now)).toEqual(create(earlier))
  })
})
