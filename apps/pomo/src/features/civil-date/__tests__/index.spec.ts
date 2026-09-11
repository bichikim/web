/** @vitest-environment node */
import {describe, expect, it} from 'vitest'
import {addDays, daysInMonth, formatDate, koreanToday, parseDate, periodEnd} from '../index'

describe('civil dates', () => {
  it('should reject invalid dates without JavaScript rollover', () => {
    expect(parseDate('2026-02-29')).toBeNull()
    expect(parseDate('2024-02-29')).toEqual({day: 29, month: 2, year: 2024})
    expect(parseDate('2026-13-01')).toBeNull()
    expect(parseDate('')).toBeNull()
  })
  it('should preserve date-only values across year boundaries', () => {
    expect(formatDate(addDays({day: 31, month: 12, year: 2025}, 1))).toBe('2026-01-01')
    expect(daysInMonth(2024, 2)).toBe(29)
    expect(daysInMonth(2100, 2)).toBe(28)
  })
  it('should end an inclusive calendar-month period on the preceding date or month end', () => {
    expect(formatDate(periodEnd({day: 1, month: 1, year: 2026}, 18))).toBe('2027-06-30')
    expect(formatDate(periodEnd({day: 31, month: 8, year: 2026}, 18))).toBe('2028-02-29')
  })
})

it('should change the Korean date at UTC 15:00', () => {
  expect(koreanToday(new Date('2026-12-31T14:59:59Z'))).toBe('2026-12-31')
  expect(koreanToday(new Date('2026-12-31T15:00:00Z'))).toBe('2027-01-01')
})
