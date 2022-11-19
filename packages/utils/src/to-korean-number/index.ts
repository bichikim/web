import {compact, flow, last, reverse} from '@winter-love/lodash'
import {chunkFn, freeze, joinFn, mapFn} from 'src/functional'
import {toNumber} from '../to-number'

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

const anyToStringArray = (value: any) => [...toNumber(value).toString()]

const KoreanChunk = 4

export const toKoreanNumberFn = ({
  mode = 'all',
  joinString = '',
  firstOne = false,
  joinGroup = '',
}: NumberToKoreanOptions = {}) =>
  flow(
    anyToStringArray,
    mode === 'all' ? mapFn((value) => _numberNames[Number(value)]) : (value) => value,
    reverse,
    chunkFn(KoreanChunk),
    mode === 'number'
      ? mapFn(removeUselessZero)
      : mapFn((value: string[], index: number, array: string[][]) =>
          addSmallNumberUnit(value, !firstOne || index < array.length - 1),
        ),
    mapFn((value: string[], index: number) => addNumberUnit(value, index)),
    mapFn((value: string[]) => compact(value).reverse().join(joinString)),
    reverse,
    joinFn(joinGroup),
  )

export const toKoreanNumber = (value?: any, options?: NumberToKoreanOptions) =>
  toKoreanNumberFn(options)(value)
