import {describe, expect, it} from 'vitest'
import {calculateSajuReading} from 'src/features/saju/calculate-reading'

describe('saju empty birth date error message', () => {
  it('should distinguish an unset birth date from an out-of-range birth date', () => {
    const empty = () =>
      calculateSajuReading({
        birth: {calendar: 'solar', date: ''},
        gender: 'N',
        question: '제 성향은?',
      })
    const outOfRange = () =>
      calculateSajuReading({
        birth: {calendar: 'solar', date: '1899-12-31'},
        gender: 'N',
        question: '제 성향은?',
      })

    expect(empty).toThrow('생년월일을 선택해 주세요.')
    expect(outOfRange).toThrow('1900년부터 2050년까지')
  })
})
