import {toNumber} from '../to-number'
import {join, last, map, reverse} from 'src/functional'
import {chunk} from 'src/chunk'
import {compact} from '../compact'
import {flow} from '../flow'
import {freeze} from '../freeze'

const _numberNames = freeze(['0', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'])
const _numberUnitNames = freeze(['', '만', '억', '조', '경', '해', '자', '양', '구', '간', '정'])
const _smallNumberUnitNames = freeze(['', '십', '백', '천'])

export type NumberToKoreanMode = 'all' | 'unit-number' | 'number'

export interface NumberToKoreanOptions {
  /**
   * @default false
   */
  firstOne?: boolean
  /**
   * which char do you want to join each number group
   * @default ''
   */
  joinGroup?: string
  /**
   * which char do you want to join each number
   * @default ''
   */
  joinString?: string
  /**
   * @default all
   */
  mode?: NumberToKoreanMode
}

const removeUselessZero = (value: string[]): string[] => {
  const _value = [...value].reverse()
  const index = _value.findIndex((value) => value !== '0')
  return _value.slice(index).reverse()
}

const addSmallNumberUnit = (value: string[], removeOne: boolean = true): string[] => {
  const _value = removeUselessZero(value).filter(Boolean)
  const hasOneItem = _value.length === 1
  return [..._value].map((value, index, array) => {
    const isFirst = index === 0
    const isLast = index === array.length - 1
    if (value === '0') {
      return ''
    }

    if (!hasOneItem && value === '일' && (removeOne || !isLast) && !isFirst) {
      return _smallNumberUnitNames[index]
    }

    return `${value}${_smallNumberUnitNames[index]}`
  })
}

const addNumberUnit = (value: string[], index: number): string[] => {
  const [first, ...rest] = value
  const _last = last(value)

  if (_last) {
    return [`${first}${_numberUnitNames[index]}`, ...rest]
  }

  return value
}

const anyToStringArray = (value: any) => {
  return [...toNumber(value).toString()]
}

const KoreanChunk = 4

export const toKoreanNumber = (value?: any, options: NumberToKoreanOptions = {}) => {
  const {mode = 'all', joinString = '', firstOne = false, joinGroup = ''} = options

  return flow(
    anyToStringArray,
    map((value: string) => {
      if (mode === 'all') {
        return _numberNames[Number(value)]
      }
      return value
    }),
    reverse,
    chunk(KoreanChunk),
    map((value: string[], index: number, array: string[][]) => {
      if (mode === 'number') {
        return removeUselessZero(value)
      }

      return addSmallNumberUnit(value, !firstOne || (index < array.length - 1))
    }),
    map((value: string[], index: number) => addNumberUnit(value, index)),
    map((value: string[]) => compact(value).reverse().join(joinString)),
    reverse,
    join(joinGroup),
  )(value)
}

