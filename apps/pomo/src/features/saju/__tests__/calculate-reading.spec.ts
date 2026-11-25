import type {BirthInput} from 'k-saju'
import {describe, expect, it} from 'vitest'
import {calculateSajuReading} from '../calculate-reading'

const birth = {calendar: 'solar', date: '1995-03-16'} as const

const getReadingPayload = (birth: BirthInput, gender: 'M' | 'F' | 'N', question: string) => {
  const {request} = calculateSajuReading({birth, gender, question})
  return {
    ...JSON.parse(request.messages[0].content.split('\n사주 계산값: ')[1]!),
    question: request.messages[1].content,
  }
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

  it.each(['', ' \n '])('should require a non-blank question: %j', (question) => {
    expect(() => calculateSajuReading({birth, gender: 'N', question})).toThrow(
      '해석할 질문을 입력해 주세요.',
    )
  })

  it.each([
    '제 일주를 알려줘',
    '일주일 뒤 면접 잘 볼까?',
    '  내일 면접 잘 볼까?\n제 일간을 알려줘  ',
    '올해 운세는? 제 일간도 알려줘',
    '나의 미래는?',
  ])('should send the original question with the same calculation: %s', (question) => {
    const result = calculateSajuReading({birth, gender: 'M', question})
    const reference = calculateSajuReading({birth, gender: 'M', question: '제 대운은?'})

    expect(result.calculation).toEqual(reference.calculation)
    expect(result.request.messages[1]).toEqual({content: question, role: 'user'})
    expect(result.calculation.chart.day).toMatchObject({hanja: '丙午', korean: '병오'})
  })

  it.each(boundaryReadingScenarios)(
    'should produce equivalent consultation facts for cross-year lunar and solar dates for $gender with $description',
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

      const lunarPayload = getReadingPayload(lunarBirth, gender, '제 재물운과 대운은 어떤가요?')
      const solarPayload = getReadingPayload(solarBirth, gender, '제 재물운과 대운은 어떤가요?')
      expect(lunarPayload).toEqual(solarPayload)
      expect(lunarPayload).not.toHaveProperty('birth')
      expect(lunarPayload).toHaveProperty('elements')
      if (gender === 'N') {
        expect(lunarPayload.daeun).toBeNull()
      } else {
        expect(lunarPayload.daeun).not.toBeNull()
      }
    },
  )

  it('should keep rejecting an invalid lunar leap date', () => {
    let thrown: unknown
    try {
      calculateSajuReading({
        birth: {calendar: 'lunar', date: '2026-01-01', isLeapMonth: true},
        gender: 'N',
        question: '2026년 운세는 어떤가요?',
      })
    } catch (cause) {
      thrown = cause
    }

    expect(thrown).toBeInstanceOf(Error)
    expect((thrown as Error).name).toBe('InvalidDateError')
    expect((thrown as Error).message).toBe('Invalid lunar date: 2026-1-1 (leap)')
  })
})
