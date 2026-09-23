/** @vitest-environment node */
import {expect, it} from 'vitest'
import {getMovingDays, lunarToSolar, solarToLunar} from '../lunar'
it('should match KASI 2026 lunar new year and round trip a leap month', () => {
  expect(solarToLunar('2026-02-17')).toEqual({day: 1, leap: false, month: 1, year: 2026})
  expect(lunarToSolar({day: 1, leap: true, month: 5, year: 2017})).toBe('2017-06-24')
  expect(solarToLunar('2017-06-24')).toEqual({day: 1, leap: true, month: 5, year: 2017})
})
it('should reject impossible leap months dates and unsupported years', () => {
  expect(lunarToSolar({day: 1, leap: true, month: 1, year: 2026})).toBeNull()
  expect(solarToLunar('2026-02-30')).toBeNull()
  expect(solarToLunar('2051-01-01')).toBeNull()
})
it('should list only existing lunar days ending in nine or zero', () => {
  const dates = getMovingDays(2026, 2)
  expect(dates).toContain('2026-02-25')
  expect(dates).toContain('2026-02-26')
  expect(dates.every((date) => [9, 0].includes((solarToLunar(date)?.day ?? -1) % 10))).toBe(true)
})

it('should round trip both solar range boundaries and reject earlier solar results', () => {
  for (const date of ['1900-01-01', '2050-12-31']) {
    const lunar = solarToLunar(date)
    expect(lunar).not.toBeNull()
    if (lunar !== null) {
      expect(lunarToSolar(lunar)).toBe(date)
    }
  }
  expect(lunarToSolar({day: 1, leap: false, month: 1, year: 1899})).toBeNull()
})
