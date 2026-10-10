import {expect, it} from 'vitest'

import {calculateSajuReading} from 'src/features/saju/calculate-reading'
import {getConvertibleLunarDays, lunarToSolar} from 'src/features/tools'

const question = '내 성향을 알려줘'

it('사주 폼이 고를 수 있게 하는 음력 12월 날짜를 계산 가능한 생일로 받아들인다', () => {
  const lunarDay = 20

  expect(getConvertibleLunarDays({leap: false, month: 12, year: 1999})).toContain(lunarDay)
  expect(lunarToSolar({day: lunarDay, leap: false, month: 12, year: 1999})).toBe('2000-01-26')
  expect(() =>
    calculateSajuReading({
      birth: {calendar: 'lunar', date: '1999-12-20', isLeapMonth: false},
      gender: 'N',
      question,
    }),
  ).not.toThrow()
})

it('양력 연도가 넘어가는 음력 11월 날짜도 같은 양력 날짜와 같은 결과를 낸다', () => {
  const lunarResult = () =>
    calculateSajuReading({
      birth: {calendar: 'lunar', date: '2023-11-20', isLeapMonth: false},
      gender: 'N',
      question,
    })
  const solarResult = calculateSajuReading({
    birth: {
      calendar: 'solar',
      date: lunarToSolar({day: 20, leap: false, month: 11, year: 2023})!,
    },
    gender: 'N',
    question,
  })

  expect(lunarResult).not.toThrow()
  expect(lunarResult()).toEqual(solarResult)
})
