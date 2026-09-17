/** @vitest-environment node */
import {expect, it} from 'vitest'
import {calculateService} from '../calculate-service'
it.each([
  {branch: 'army', end: '2027-06-30', total: 546},
  {branch: 'marines', end: '2027-06-30', total: 546},
  {branch: 'navy', end: '2027-08-31', total: 608},
  {branch: 'air', end: '2027-09-30', total: 638},
  {branch: 'army', days: 300, end: '2026-10-27', total: 300},
  {branch: 'army', days: 1, end: '2026-01-01', total: 1},
] as const)('should complete $branch service on discharge day with $total days', (period) => {
  expect(calculateService({...period, start: '2026-01-01', today: period.end})).toMatchObject({
    end: period.end,
    progress: 100,
    remaining: 0,
    total: period.total,
  })
})

it.each([
  {progress: 0, remaining: 300, today: '2025-12-31'},
  {progress: 0, remaining: 299, today: '2026-01-01'},
  {progress: 50, remaining: 149, today: '2026-05-31'},
  {progress: (298 / 300) * 100, remaining: 1, today: '2026-10-26'},
  {progress: 100, remaining: 0, today: '2026-10-28'},
])('should preserve elapsed-day progress before discharge and clamp after it on $today', (day) => {
  expect(
    calculateService({branch: 'army', days: 300, start: '2026-01-01', today: day.today}),
  ).toMatchObject({progress: day.progress, remaining: day.remaining})
})

it('should keep a one-day service incomplete before enlistment', () => {
  expect(
    calculateService({branch: 'army', days: 1, start: '2026-01-01', today: '2025-12-31'}),
  ).toMatchObject({progress: 0, remaining: 1})
})

it.each([
  {days: undefined, total: 546},
  {days: 300, total: 300},
] as const)('should cap remaining days at total before enlistment', (period) => {
  expect(
    calculateService({
      branch: 'army',
      days: period.days,
      start: '2026-01-01',
      today: '2025-01-01',
    }),
  ).toMatchObject({progress: 0, remaining: period.total, total: period.total})
})

it('should calculate modern service terms including enlistment day', () => {
  expect(
    calculateService({branch: 'army', start: '2026-01-01', today: '2026-01-01'}),
  ).toMatchObject({end: '2027-06-30', progress: 0, remaining: 545})
  expect(calculateService({branch: 'navy', start: '2026-01-01', today: '2026-01-01'})?.end).toBe(
    '2027-08-31',
  )
  expect(calculateService({branch: 'air', start: '2026-01-01', today: '2026-01-01'})?.end).toBe(
    '2027-09-30',
  )
})
it('should use a supplied day count and clamp future and completed progress', () => {
  expect(
    calculateService({branch: 'army', days: 365, start: '2026-01-01', today: '2027-01-01'}),
  ).toMatchObject({end: '2026-12-31', progress: 100, remaining: 0})
  expect(
    calculateService({branch: 'army', start: '2026-01-01', today: '2025-01-01'})?.progress,
  ).toBe(0)
  expect(
    calculateService({branch: 'army', days: 0, start: '2026-01-01', today: '2026-01-01'}),
  ).toBeNull()
  expect(calculateService({branch: 'army', start: '2010-01-01', today: '2026-01-01'})).toBeNull()
})

it('should include enlistment day in custom duration and reject invalid periods', () => {
  expect(
    calculateService({branch: 'army', days: 300, start: '2026-01-01', today: '2026-01-01'}),
  ).toMatchObject({end: '2026-10-27', remaining: 299, total: 300})
  expect(
    calculateService({branch: 'army', days: 1, start: '2024-02-29', today: '2024-02-29'}),
  ).toMatchObject({end: '2024-02-29', total: 1})
  for (const days of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER]) {
    expect(
      calculateService({branch: 'army', days, start: '2026-01-01', today: '2026-01-01'}),
    ).toBeNull()
  }
})
