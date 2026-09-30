import {describe, expect, it} from 'vitest'
import {parseInteger} from '../index'

const FULLWIDTH_HYPHEN_MINUS = '\uFF0D'

describe('parseInteger', () => {
  it('should parse signed integers with ASCII and Unicode signs', () => {
    expect(parseInteger('-5')).toBe(-5n)
    expect(parseInteger('−5')).toBe(-5n)
    expect(parseInteger('+5')).toBe(5n)
    expect(parseInteger('＋5')).toBe(5n)
  })

  it('should parse negative integers with a fullwidth hyphen-minus', () => {
    expect(parseInteger(`${FULLWIDTH_HYPHEN_MINUS}12`)).toBe(-12n)
    expect(parseInteger(`${FULLWIDTH_HYPHEN_MINUS}5,000`)).toBe(-5_000n)
  })

  it('should reject leading-zero identifiers with a fullwidth hyphen-minus', () => {
    expect(parseInteger(`${FULLWIDTH_HYPHEN_MINUS}007`)).toBeNull()
  })

  it('should preserve grouped values and reject leading-zero identifiers', () => {
    expect(parseInteger('−5,000')).toBe(-5_000n)
    expect(parseInteger('007')).toBeNull()
    expect(parseInteger('−007')).toBeNull()
  })

  it('should return null for invalid integer tokens', () => {
    expect(parseInteger('--5')).toBeNull()
    expect(parseInteger('five')).toBeNull()
  })
})
