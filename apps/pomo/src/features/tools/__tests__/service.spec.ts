/** @vitest-environment node */
import {expect, it} from 'vitest'
import {calculateService} from '../service'
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
