/** @vitest-environment node */
import {describe, expect, it} from 'vitest'
import {addDays, daysInMonth, formatDate, parseDate, periodEnd} from '../index'

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
  it.each([
    {date: {day: 15, month: 1, year: 2023}, expected: '2023-02-14', months: 1},
    {date: {day: 31, month: 1, year: 2023}, expected: '2023-02-27', months: 1},
    {date: {day: 31, month: 1, year: 2023}, expected: '2024-09-29', months: 20},
    {date: {day: 31, month: 3, year: 2023}, expected: '2024-09-29', months: 18},
    {date: {day: 31, month: 5, year: 2023}, expected: '2024-11-29', months: 18},
    {date: {day: 31, month: 8, year: 2026}, expected: '2028-02-28', months: 18},
    {date: {day: 31, month: 1, year: 2023}, expected: '2024-10-30', months: 21},
    {date: {day: 1, month: 1, year: 2026}, expected: '2027-06-30', months: 18},
  ])('should end an inclusive calendar-month period at $expected', (period) => {
    expect(formatDate(periodEnd(period.date, period.months))).toBe(period.expected)
  })
})
