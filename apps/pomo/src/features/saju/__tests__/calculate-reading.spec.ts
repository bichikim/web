import type {BirthInput} from 'k-saju'
import {describe, expect, it} from 'vitest'
import {calculateSajuReading} from '../index'

const birth = {calendar: 'solar', date: '1995-03-16'} as const

type SerializedReadingPayload = {readonly birth: BirthInput; readonly [key: string]: unknown}

const getReadingPayload = (birth: BirthInput, gender: 'M' | 'F' | 'N') => {
  const result = calculateSajuReading({birth, gender, question: '제 재물운은 어떤가요?'})
  if (result.type !== 'generate') {
    throw new Error(`expected a generated reading, received ${result.type}`)
  }
  const content = result.request.messages.at(-1)?.content
  if (content === undefined) {
    throw new Error('expected a serialized user message')
  }
  return JSON.parse(content) as SerializedReadingPayload
}

const boundaryBirthScenarios = [
  {
    birthDetails: {},
    description: 'unknown time with default KST',
    lunarDate: '1999-12-20',
    solarDate: '2000-01-26',
  },
  {
    birthDetails: {time: '23:30'},
    description: 'known KST time',
    lunarDate: '1999-12-20',
    solarDate: '2000-01-26',
  },
  {
    birthDetails: {longitude: -74.006, time: '00:30', tzOffsetMin: -300},
    description: 'known time with timezone and longitude',
    lunarDate: '1999-12-20',
    solarDate: '2000-01-26',
  },
  {
    birthDetails: {},
    description: 'another unknown-time year boundary',
    lunarDate: '2023-11-20',
    solarDate: '2024-01-01',
  },
] as const
const boundaryReadingScenarios = boundaryBirthScenarios.flatMap(
  ({birthDetails, description, lunarDate, solarDate}) =>
    (['M', 'F', 'N'] as const).map((gender) => ({
      birthDetails,
      description,
      gender,
      lunarDate,
      solarDate,
    })),
)

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

  it.each(boundaryReadingScenarios)(
    'should calculate a cross-year lunar birth for $gender with $description and preserve the original birth',
    ({birthDetails, gender, lunarDate, solarDate}) => {
      const lunarBirth: BirthInput = {
        calendar: 'lunar',
        date: lunarDate,
        isLeapMonth: false,
        ...birthDetails,
      }
      const solarBirth: BirthInput = {
        calendar: 'solar',
        date: solarDate,
        ...birthDetails,
      }

      const lunarPayload = getReadingPayload(lunarBirth, gender)
      const solarPayload = getReadingPayload(solarBirth, gender)
      const {birth: serializedLunarBirth, ...lunarFacts} = lunarPayload
      const {birth: serializedSolarBirth, ...solarFacts} = solarPayload

      expect(lunarFacts).toEqual(solarFacts)
      expect(serializedLunarBirth).toEqual(lunarBirth)
      expect(serializedSolarBirth).toEqual(solarBirth)
      expect(lunarFacts).toHaveProperty('chart')
      if (gender === 'N') {
        expect(lunarFacts.daeun).toBeNull()
      } else {
        expect(lunarFacts.daeun).not.toBeNull()
      }
    },
  )

  it('should keep annual-fortune intent ahead of lunar calculation', () => {
    expect(
      calculateSajuReading({
        birth: {calendar: 'lunar', date: '1999-12-20', isLeapMonth: false},
        gender: 'N',
        question: '2026년 취업운은 어떤가요?',
      }),
    ).toEqual({
      text: '특정 연도 운세는 계산하지 않아요. 연도를 빼고 다시 질문해 주세요.',
      type: 'notice',
    })
  })

  it('should keep rejecting an invalid lunar leap date', () => {
    let thrown: unknown
    try {
      calculateSajuReading({
        birth: {calendar: 'lunar', date: '2026-01-01', isLeapMonth: true},
        gender: 'N',
        question: '제 재물운은 어떤가요?',
      })
    } catch (cause) {
      thrown = cause
    }

    expect(thrown).toBeInstanceOf(Error)
    expect((thrown as Error).name).toBe('InvalidDateError')
    expect((thrown as Error).message).toBe('Invalid lunar date: 2026-1-1 (leap)')
  })
})
