import {expect, it} from 'vitest'

import {requiresAnnualReading} from '../requires-annual-reading'

it('should identify explicit and relative annual fortune questions', () => {
  expect(requiresAnnualReading('2026년 취업운은 어떤가요?')).toBe(true)
  expect(requiresAnnualReading('내년 재물운은?')).toBe(true)
  expect(requiresAnnualReading('올해는 어떤가요?')).toBe(true)
})

it('should keep natal questions available', () => {
  expect(requiresAnnualReading('1995년생의 성향은 어떤가요?')).toBe(false)
  expect(requiresAnnualReading('제 성향을 어떻게 해석하나요?')).toBe(false)
})

it.each(['1995년 생의 성향은 어떤가요?', '1995년  생 성향은?', '1995년 생은 어떤 성향인가요?'])(
  'should keep a spaced birth-year question available: %s',
  (question) => {
    expect(requiresAnnualReading(question)).toBe(false)
  },
)

it.each([
  '1995년 생의 2026년 운세는?',
  '1995년 생의 내년 운세는?',
  '2026년 생활은 어떤가요?',
  '2026년 생산 계획은?',
  '2026년 생일 운세는?',
])('should retain annual-year checks beyond a birth-year expression: %s', (question) => {
  expect(requiresAnnualReading(question)).toBe(true)
})
