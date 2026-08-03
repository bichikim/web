import {chunk, compact, last} from 'es-toolkit/array'
import {freeze} from 'src/core/functions/freeze'

const _numberNames = freeze(['0', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'])

const _numberUnitNames = freeze(['', '만', '억', '조', '경', '해', '자', '양', '구', '간', '정'])
const _smallNumberUnitNames = freeze(['', '십', '백', '천'])
const INTEGER_REGEX = /^[+-]?\d+$/u
const KOREAN_CHUNK_SIZE = 4

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

interface NormalizedInteger {
  readonly digits: string
  readonly negative: boolean
}

const normalizeInteger = (value: unknown): NormalizedInteger | undefined => {
  let text: string

  if (typeof value === 'bigint') {
    text = value.toString()
  } else if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) {
      return undefined
    }

    text = String(value)
  } else if (typeof value === 'string') {
    text = value.trim()
  } else {
    return undefined
  }

  if (!INTEGER_REGEX.test(text)) {
    return undefined
  }

  const negative = text.startsWith('-')
  const unsignedText = /^[+-]/u.test(text) ? text.slice(1) : text
  const digits = unsignedText.replace(/^0+(?=\d)/u, '')

  return {
    digits,
    negative: negative && digits !== '0',
  }
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
export const toKoreanNumberFn = ({
  mode = 'all',
  joinString = '',
  firstOne = false,
  joinGroup = '',
}: NumberToKoreanOptions = {}) => {
  return (value: unknown) => {
    const normalizedInteger = normalizeInteger(value)

    if (normalizedInteger === undefined) {
      return ''
    }

    const {digits, negative} = normalizedInteger

    if (digits === '0') {
      return mode === 'all' ? '영' : '0'
    }

    const numberStrings = [...digits]
    const numberNames =
      mode === 'all' ? numberStrings.map((item) => _numberNames[Number(item)]) : numberStrings
    const numberGroups = chunk(numberNames.reverse(), KOREAN_CHUNK_SIZE)

    if (numberGroups.length > _numberUnitNames.length) {
      return ''
    }

    const smallUnitGroups =
      mode === 'number'
        ? numberGroups.map(removeUselessZero)
        : numberGroups.map((group, index, groups) =>
            addSmallNumberUnit(group, !firstOne || index < groups.length - 1),
          )

    const result = smallUnitGroups
      .map(addNumberUnit)
      .map((group) => compact(group).reverse().join(joinString))
      .reverse()
      .join(joinGroup)

    if (!negative) {
      return result
    }

    return `${mode === 'all' ? '마이너스' : '-'}${result}`
  }
}

export const toKoreanNumber = (value?: unknown, options?: NumberToKoreanOptions) =>
  toKoreanNumberFn(options)(value)
