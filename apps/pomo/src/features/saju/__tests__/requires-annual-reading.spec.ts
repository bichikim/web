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
