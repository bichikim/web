import type {BirthInput} from 'k-saju'
import {parseDate} from 'src/features/civil-date'
import {lunarToSolar} from '../tools/lunar'

/** Resolves lunar dates with the app's calendar before passing calculation input to k-saju. */
export function toSajuCalculationBirth(birth: BirthInput): BirthInput {
  if (birth.calendar !== 'lunar') {
    return birth
  }

  const lunarDate = parseDate(birth.date)
  if (lunarDate === null) {
    return birth
  }

  const solarDate = lunarToSolar({...lunarDate, leap: birth.isLeapMonth ?? false})
  if (solarDate === null) {
    return birth
  }

  const calculationBirth: BirthInput = {...birth, calendar: 'solar', date: solarDate}
  delete calculationBirth.isLeapMonth
  return calculationBirth
}
