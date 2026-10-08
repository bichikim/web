import {describe, expect, it} from 'vitest'
import {calculateSajuReading} from '../index'

const birth = {calendar: 'solar', date: '1995-03-16'} as const

describe('calculateSajuReading', () => {
  it('should require a birth date and question', () => {
    expect(() =>
      calculateSajuReading({birth: {...birth, date: ''}, gender: 'N', question: '성향은?'}),
    ).toThrow('생년월일')
    expect(() => calculateSajuReading({birth, gender: 'N', question: ''})).toThrow('질문')
  })

  it('should answer a broad future question without sending it to a model', () => {
    const result = calculateSajuReading({birth, gender: 'N', question: '나의 미래는?'})
    expect(result.type).toBe('answer')
  })

  it('should send calculated facts and the user question for interpretation', () => {
    const result = calculateSajuReading({birth, gender: 'N', question: '제 일은 어떨까요?'})
    expect(result.type).toBe('generate')
    if (result.type === 'generate') {
      expect(result.request.messages.at(-1)?.content).toContain('제 일은 어떨까요?')
      expect(result.request.messages.at(-1)?.content).toContain('"daeun":null')
    }
  })

  it('should send an unmatched question to the model without fallback data', () => {
    const result = calculateSajuReading({birth, gender: 'N', question: '제 취미는 어떤가요?'})

    expect(result.type).toBe('generate')
    if (result.type === 'generate') {
      expect(result.request.messages.at(-1)?.content).toContain('제 취미는 어떤가요?')
      expect(result.request).not.toHaveProperty('fallbackAnswer')
    }
  })

  it('should reject annual fortune questions without calculated annual data', () => {
    expect(calculateSajuReading({birth, gender: 'N', question: '올해 운세는?'}).type).toBe('notice')
  })
})
