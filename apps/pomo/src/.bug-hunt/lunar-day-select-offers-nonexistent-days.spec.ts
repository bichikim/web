/** @vitest-environment node */

import {describe, expect, it} from 'vitest'

import {lunarToSolar} from 'src/features/tools/lunar'

/** Matches Lunar.tsx day dropdown: options(1, MAXIMUM_DAY) with MAXIMUM_DAY = 30. */
const LUNAR_DAY_SELECT_MAXIMUM = 30

const selectableDaysWithoutSolarConversion = (
  year: number,
  month: number,
  leap: boolean,
): number[] =>
  Array.from({length: LUNAR_DAY_SELECT_MAXIMUM}, (_, index) => index + 1).filter(
    (day) => lunarToSolar({day, leap, month, year}) === null,
  )

describe('lunar tool day dropdown', () => {
  it('should not offer lunar days that cannot convert to solar (2050-11 ends on day 18)', () => {
    expect(selectableDaysWithoutSolarConversion(2050, 11, false)).toEqual([])
  })
})
