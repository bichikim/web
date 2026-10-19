import type {BirthInput} from 'k-saju'
import {expect, it} from 'vitest'
import {toSajuCalculationBirth} from '../to-saju-calculation-birth'

it('should convert cross-year lunar dates and preserve time and location metadata', () => {
  const birth: BirthInput = {
    calendar: 'lunar',
    date: '1999-12-20',
    isLeapMonth: false,
    longitude: -74.006,
    time: '00:30',
    tzOffsetMin: -300,
  }

  expect(toSajuCalculationBirth(birth)).toEqual({
    calendar: 'solar',
    date: '2000-01-26',
    longitude: -74.006,
    time: '00:30',
    tzOffsetMin: -300,
  })
  expect(birth).toEqual({
    calendar: 'lunar',
    date: '1999-12-20',
    isLeapMonth: false,
    longitude: -74.006,
    time: '00:30',
    tzOffsetMin: -300,
  })
})

it('should convert a valid leap-month date and omit the lunar-only flag from calculation input', () => {
  expect(
    toSajuCalculationBirth({calendar: 'lunar', date: '2017-05-01', isLeapMonth: true}),
  ).toEqual({calendar: 'solar', date: '2017-06-24'})
})

it('should pass invalid or unsupported lunar dates through for the engine to reject', () => {
  const invalidLeap: BirthInput = {
    calendar: 'lunar',
    date: '2026-01-01',
    isLeapMonth: true,
  }
  const unsupported: BirthInput = {
    calendar: 'lunar',
    date: '2050-11-19',
    isLeapMonth: false,
  }

  expect(toSajuCalculationBirth(invalidLeap)).toBe(invalidLeap)
  expect(toSajuCalculationBirth(unsupported)).toBe(unsupported)
})

it('should leave solar births unchanged', () => {
  const birth: BirthInput = {calendar: 'solar', date: '2000-01-26', time: '07:30'}
  expect(toSajuCalculationBirth(birth)).toBe(birth)
})
