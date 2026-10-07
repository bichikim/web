import {describe, expect, it} from 'vitest'
import {
  areReminderDraftsEqual,
  createReminderDraft,
  resolveReminderAt,
  resolveReminderDraft,
} from '../reminder-draft'

describe('reminder draft dates', () => {
  it('should resolve today against the save date after midnight', () => {
    const savedAt = new Date(2026, 1, 1, 0, 30)

    expect(resolveReminderAt('today', '2026-01-31', '09:05', savedAt)).toBe(
      new Date(2026, 1, 1, 9, 5).toISOString(),
    )
  })
  it('should preserve a custom reminder date', () => {
    const savedAt = new Date(2026, 1, 1, 0, 30)

    expect(resolveReminderAt('custom', '2026-02-03', '09:05', savedAt)).toBe(
      new Date(2026, 1, 3, 9, 5).toISOString(),
    )
  })
  it('should reject invalid custom calendar dates instead of rolling them over', () => {
    const savedAt = new Date(2026, 1, 1, 0, 30)

    expect(resolveReminderAt('custom', '2026-02-30', '09:05', savedAt)).toBeNull()
    expect(resolveReminderAt('custom', '2026-02-29', '09:05', savedAt)).toBeNull()
  })
  it('should resolve tomorrow across a local year boundary without changing now', () => {
    const now = new Date(2026, 11, 31, 23, 59, 45)
    const timestamp = now.getTime()
    expect(resolveReminderAt('tomorrow', '', '09:05', now)).toBe(
      new Date(2027, 0, 1, 9, 5).toISOString(),
    )
    expect(now.getTime()).toBe(timestamp)
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
  it('should ignore a hidden recall mode difference while exact reminders are enabled', () => {
    const draft = createReminderDraft({
      exactReminderAt: new Date('2026-09-21T14:30').toISOString(),
      now: new Date('2026-09-20T12:00'),
      recallMode: 'none',
    })

    expect(areReminderDraftsEqual(draft, {...draft, recallMode: 'random'})).toBe(true)
  })
})

describe('persisted reminder settings', () => {
  it('should resolve a today draft at save time and retain advance, repetition and recall settings', () => {
    const draft = {
      ...createReminderDraft({
        exactReminderAdvanceMinutes: 15,
        exactReminderAt: new Date(2026, 0, 31, 9, 5).toISOString(),
        exactReminderRepeatIntervalMinutes: 20,
        exactReminderRepeatUntilMinutes: 80,
        now: new Date(2026, 0, 31, 8),
        recallMode: 'random',
      }),
      reminderDay: 'today' as const,
    }
    const savedAt = new Date(2026, 1, 1, 0, 30)

    expect(resolveReminderDraft(draft, savedAt)).toEqual({
      exactReminderAdvanceMinutes: 15,
      exactReminderAt: new Date(2026, 1, 1, 9, 5).toISOString(),
      exactReminderRepeatIntervalMinutes: 20,
      exactReminderRepeatUntilMinutes: 80,
      recallMode: 'random',
    })
    expect(draft.customDate).toBe('2026-01-31')
  })
  it('should omit disabled repetition while retaining its configured end and advance', () => {
    const now = new Date(2026, 0, 31, 8)
    const draft = {
      ...createReminderDraft({
        exactReminderAdvanceMinutes: 15,
        exactReminderAt: new Date(2026, 0, 31, 9, 5).toISOString(),
        exactReminderRepeatUntilMinutes: 80,
        now,
        recallMode: 'none',
      }),
      exactReminderRepeatIntervalMinutes: 20,
    }

    expect(resolveReminderDraft(draft, now)).toMatchObject({
      exactReminderAdvanceMinutes: 15,
      exactReminderRepeatIntervalMinutes: null,
      exactReminderRepeatUntilMinutes: 80,
    })
  })
  it('should keep hidden repeat settings when exact reminders are disabled', () => {
    const now = new Date(2026, 0, 31, 8)
    const draft = {
      ...createReminderDraft({
        exactReminderAt: null,
        exactReminderRepeatIntervalMinutes: 20,
        now,
        recallMode: 'random',
      }),
      customDate: 'invalid',
      reminderDay: 'custom' as const,
      reminderTime: 'invalid',
    }

    expect(resolveReminderDraft(draft, now)).toMatchObject({
      exactReminderAt: null,
      exactReminderRepeatIntervalMinutes: 20,
      recallMode: 'random',
    })
  })
  it('should return null for invalid enabled dates without dropping other settings', () => {
    const now = new Date(2026, 1, 1, 8)
    const draft = {
      ...createReminderDraft({
        exactReminderAt: now.toISOString(),
        exactReminderRepeatIntervalMinutes: 20,
        now,
        recallMode: 'random',
      }),
      customDate: '2026-02-30',
      reminderDay: 'custom' as const,
    }

    expect(resolveReminderDraft(draft, now)).toMatchObject({
      exactReminderAt: null,
      exactReminderRepeatIntervalMinutes: 20,
      recallMode: 'random',
    })
  })
})
