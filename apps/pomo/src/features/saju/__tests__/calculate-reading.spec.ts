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
  it.each(['solar', 'lunar'] as const)('should request an unset %s birth date', (calendar) => {
    expect(() =>
      calculateSajuReading({birth: {calendar, date: ''}, gender: 'N', question: '성향은?'}),
    ).toThrow('생년월일을 선택해 주세요.')
  })

  it.each(['1899-12-31', '2051-01-01'])(
    'should retain the birth-year range guidance for %s',
    (date) => {
      expect(() =>
        calculateSajuReading({birth: {...birth, date}, gender: 'N', question: '성향은?'}),
      ).toThrow('생년월일은 1900년부터 2050년까지 선택해 주세요.')
    },
  )

  it('should require a question after a valid birth date', () => {
    expect(() => calculateSajuReading({birth, gender: 'N', question: ''})).toThrow('질문')
  })

  it('should answer a broad future question without sending it to a model', () => {
    const result = calculateSajuReading({birth, gender: 'N', question: '나의 미래는?'})
    expect(result.type).toBe('answer')
  })

  it.each([
    '미래는 어떨까요?',
    '앞날은 어떨까요?',
    '내 앞날은 어떨까요?',
    '미래 좀 알려줘',
    '운세 좀 봐줘',
  ])('should ask for a topic without requesting generation: %s', (question) => {
    expect(calculateSajuReading({birth, gender: 'N', question})).toEqual({
      text: expect.stringContaining('재물, 일, 관계'),
      type: 'answer',
    })
  })

  it.each([
    '제 일은 어떨까요?',
    '미래의 재물운은 어떨까요?',
    '내 사업의 미래는 어떨까요?',
    '미래 재물운 좀 알려줘',
    '운세 중 연애운 좀 봐줘',
    '미래 좀 알려줘, 특히 직업이 궁금해',
    '과거는 어떨까요?',
    '운세는 어땠나요?',
  ])(
    'should preserve generation and the original question for an unmatched expression: %s',
    (question) => {
      const result = calculateSajuReading({birth, gender: 'N', question})
      expect(result.type).toBe('generate')
      if (result.type === 'generate') {
        expect(JSON.parse(result.request.messages.at(-1)!.content)).toMatchObject({question})
      }
    },
  )

  it.each([
    '올해 운세는 어떨까요?',
    '내년 운세 좀 봐줘',
    '2026년 미래 좀 알려줘',
    '2026년 생활은 어떤가요?',
    '2026년생활은 어떤가요?',
    '2026년생산 계획은?',
  ])('should preserve the annual reading notice for an equivalent ending: %s', (question) => {
    expect(calculateSajuReading({birth, gender: 'N', question})).toEqual({
      text: '특정 연도 운세는 계산하지 않아요. 연도를 빼고 다시 질문해 주세요.',
      type: 'notice',
    })
  })

  it('should answer a diary day-stem fact without requesting generation', () => {
    expect(
      calculateSajuReading({birth, gender: 'N', question: '제 일기에 적을 내 일간은 무엇인가요?'}),
    ).toEqual({
      text: '입력한 생년월일의 일간은 병(丙)입니다. 일간은 일주의 천간으로, 십성 관계를 계산할 때 기준이 됩니다.',
      type: 'answer',
    })
  })

  it.each([
    '제 일주로 내 일과 돈복은 어떤지 알려줘',
    '제 일주로 내 일이 맞을지 알려줘',
    '제 일주로 하는 일은 어떤지 알려줘',
    '제 일주로 내 일인지 알려줘',
    '제 일주로 하는 일이라면 무엇을 할까?',
    '제 일주로 내 일에는 어떤 의미가 있는지 알려줘',
    '제 일기에 적을 제 일주로 하는 일은 어떤지 알려줘',
  ])('should keep a day-pillar work interpretation on the generation path: %s', (question) => {
    expect(calculateSajuReading({birth, gender: 'N', question}).type).toBe('generate')
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

  it.each([
    '1995년생의 성향은 어떤가요?',
    '1995년 생의 성향은 어떤가요?',
    '1995년 생은 어떤 성향인가요?',
    '1995년생만 성향이 다른가요?',
    '1995년생부터 성향을 알려주세요',
    '1995년생처럼 행동하나요?',
    '1995년생에 관한 성향을 알려줘',
    '1995년생끼리 궁합은?',
    '1995년생일 경우 제 성향은 어떤가요?',
  ])('should generate a natal interpretation for a birth-year question: %s', (question) => {
    const result = calculateSajuReading({birth, gender: 'N', question})
    expect(result.type).toBe('generate')
    if (result.type === 'generate') {
      expect(result.request.messages.at(-1)?.content).toContain(question)
      expect(result.request.messages.at(-1)?.content).toContain('"daeun":null')
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
