/** @vitest-environment node */
import {expect, it} from 'vitest'

import {solarToLunar} from '../features/tools/lunar'

it('should convert a solar date pasted with fullwidth digits to lunar', () => {
  expect(solarToLunar('２０２６-０２-１７')).toEqual({
    day: 1,
    leap: false,
    month: 1,
    year: 2026,
  })
})

it('should match the ASCII solar date conversion for the same calendar day', () => {
  const ascii = solarToLunar('2026-02-17')
  const fullwidth = solarToLunar('２０２６-０２-１７')

  expect(ascii).toEqual({day: 1, leap: false, month: 1, year: 2026})
  expect(fullwidth).toEqual(ascii)
})
