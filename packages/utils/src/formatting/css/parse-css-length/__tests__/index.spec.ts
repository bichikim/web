import {afterEach, describe, expect, it, vi} from 'vitest'
import {parseCssLength, parseCssLengthLocal} from '../'

describe('parseCssLengthLocal', () => {
  it('should parse common CSS length units', () => {
    expect(parseCssLengthLocal('100px')).toEqual({unit: 'px', value: 100})
    expect(parseCssLengthLocal('10rem')).toEqual({unit: 'rem', value: 10})
    expect(parseCssLengthLocal('10.5em')).toEqual({unit: 'em', value: 10.5})
    expect(parseCssLengthLocal('100%')).toEqual({unit: '%', value: 100})
  })

  it('should parse unitless numeric strings', () => {
    expect(parseCssLengthLocal('100')).toEqual({unit: '', value: 100})
    expect(parseCssLengthLocal('0')).toEqual({unit: '', value: 0})
  })

  it('should parse signed and decimal values', () => {
    expect(parseCssLengthLocal('-10px')).toEqual({unit: 'px', value: -10})
    expect(parseCssLengthLocal('+10px')).toEqual({unit: 'px', value: 10})
    expect(parseCssLengthLocal('.5px')).toEqual({unit: 'px', value: 0.5})
    expect(parseCssLengthLocal('0.5px')).toEqual({unit: 'px', value: 0.5})
    expect(parseCssLengthLocal('+.5%')).toEqual({unit: '%', value: 0.5})
  })

  it('should return undefined for invalid length strings', () => {
    expect(parseCssLengthLocal('')).toBeUndefined()
    expect(parseCssLengthLocal(' 100px')).toBeUndefined()
    expect(parseCssLengthLocal('100 px')).toBeUndefined()
    expect(parseCssLengthLocal('px100')).toBeUndefined()
    expect(parseCssLengthLocal('100PX')).toBeUndefined()
    expect(parseCssLengthLocal('calc(100px)')).toBeUndefined()
    expect(parseCssLengthLocal('em')).toBeUndefined()
    expect(parseCssLengthLocal('10.')).toBeUndefined()
    expect(parseCssLengthLocal('1e2px')).toBeUndefined()
    expect(parseCssLengthLocal('10px10')).toBeUndefined()
  })
})

describe('parseCssLength', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should parse css length via local fallback when CSSNumericValue is unavailable', () => {
    expect(typeof CSSNumericValue).toBe('undefined')
    expect(parseCssLength('100px')).toEqual({unit: 'px', value: 100})
    expect(parseCssLength('invalid')).toBeUndefined()
  })

  it('should parse css length via CSSNumericValue when available', () => {
    class MockCSSUnitValue {
      constructor(
        public unit: string,
        public value: number,
      ) {}
    }

    const parse = vi.fn((length: string) => {
      if (length === '2rem') {
        return new MockCSSUnitValue('px', 32)
      }

      if (length === '100px') {
        return new MockCSSUnitValue('px', 100)
      }

      throw new Error('invalid')
    })

    vi.stubGlobal('CSSUnitValue', MockCSSUnitValue)
    vi.stubGlobal('CSSNumericValue', {parse})

    expect(parseCssLength('100px')).toEqual({unit: 'px', value: 100})
    expect(parseCssLength('2rem')).toEqual({unit: 'px', value: 32})
    expect(parseCssLength('invalid')).toBeUndefined()
    expect(parse).toHaveBeenCalledWith('100px')
    expect(parse).toHaveBeenCalledWith('2rem')
  })
})
