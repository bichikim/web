import {afterEach, beforeEach, expect, it} from 'vitest'
import {isFirstReminderInFuture, resolveReminderAt} from '../reminder-draft'

const originalTimeZone = process.env.TZ

beforeEach(() => {
  process.env.TZ = 'America/New_York'
  expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('America/New_York')
})

afterEach(() => {
  if (originalTimeZone === undefined) {
    delete process.env.TZ
  } else {
    process.env.TZ = originalTimeZone
  }
})

it('should reject a nonexistent spring-forward custom reminder time', () => {
  const now = new Date('2026-03-08T04:00:00.000Z')

  expect(resolveReminderAt('custom', '2026-03-08', '02:30', now)).toBeNull()
})

it.each([
  {expected: '2026-03-08T06:59:00.000Z', time: '01:59'},
  {expected: '2026-03-08T07:00:00.000Z', time: '03:00'},
])('should preserve the valid $time wall time around spring-forward', ({expected, time}) => {
  expect(
    resolveReminderAt('custom', '2026-03-08', time, new Date('2026-03-08T04:00:00.000Z')),
  ).toBe(expected)
})

it('should preserve the existing fall-back resolution for an ambiguous wall time', () => {
  expect(
    resolveReminderAt('custom', '2026-11-01', '01:30', new Date('2026-11-01T04:00:00.000Z')),
  ).toBe('2026-11-01T05:30:00.000Z')
})

it('should keep a custom midnight strictly future only until its exact instant', () => {
  const beforeMidnight = new Date('2026-03-09T03:59:59.999Z')
  const midnight = new Date('2026-03-09T04:00:00.000Z')
  const reminderAt = resolveReminderAt('custom', '2026-03-09', '00:00', beforeMidnight)

  expect(reminderAt).toBe(midnight.toISOString())
  expect(isFirstReminderInFuture(reminderAt, 0, beforeMidnight)).toBe(true)
  expect(isFirstReminderInFuture(reminderAt, 0, midnight)).toBe(false)
})
