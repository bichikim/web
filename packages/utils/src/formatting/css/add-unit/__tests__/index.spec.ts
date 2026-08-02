import {describe, expect, expectTypeOf, it} from 'vitest'
import {addEm, addPx, addRem, addUnit, addUnitFn, addUnitRight} from '../'

describe('addUnitFn type check', () => {
  it('should match reverse-curried addUnit', () => {
    const partial: (value: unknown) => string = addUnitFn(3, 'px')

    expectTypeOf(partial).parameters.toEqualTypeOf<[unknown]>()
    expectTypeOf(partial).returns.toEqualTypeOf<string>()
    expectTypeOf(partial(0)).toEqualTypeOf<string>()
  })
})

describe('addUnit', () => {
  it('should return unit string with number', () => {
    expect(addUnit(1, 'px')).toEqual('1px')
  })

  it('should return unit string with number string', () => {
    expect(addUnit('1', 'px')).toEqual('1px')
  })

  it('should round to three decimal places by default', () => {
    expect(addUnit(1 / 3, 'px')).toEqual('0.333px')
  })

  it('should round to the given decimal places', () => {
    expect(addUnit(1 / 3, 'px', 2)).toEqual('0.33px')
  })

  it('should return empty string when value cannot be parsed', () => {
    expect(addUnit('1px', 'px')).toEqual('')
  })

  it('should return empty string with object', () => {
    expect(addUnit({foo: 'foo'}, 'px')).toEqual('')
  })

  it('should return empty string with array', () => {
    expect(addUnit([1, 2], 'px')).toEqual('')
  })

  it.each([null, '', '   ', [], false, true])(
    'should return empty string with unsupported coercible value %j',
    (value) => {
      expect(addUnit(value, 'px')).toBe('')
    },
  )

  it('should return empty string when formatted value is not finite', () => {
    expect(addUnit(Number.POSITIVE_INFINITY, 'px')).toEqual('')
  })

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -1, 1.5, 309])(
    'should return empty string with invalid decimal places %s',
    (decimalPlaces) => {
      expect(addUnit(1, 'px', decimalPlaces)).toBe('')
    },
  )

  it('should return empty string when rounding overflows', () => {
    expect(addUnit(Number.MAX_VALUE, 'px', 3)).toBe('')
  })

  it('should return unit string without unit', () => {
    expect(addUnit(1)).toEqual('1')
  })

  it('should support direct right-call with zero values', () => {
    expect(addUnitRight(0, 'px', 0)).toEqual('0px')
  })

  it('should support partial application with preset decimal places', () => {
    expect(addUnitRight(3, 'px')(0)).toEqual('0px')
  })
})

describe('addPx', () => {
  it('should add px', () => {
    expect(addPx(1)).toEqual('1px')
  })

  it('should round to three decimal places', () => {
    expect(addPx(1 / 3)).toEqual('0.333px')
  })
})

describe('addEm', () => {
  it('should add em', () => {
    expect(addEm(1)).toEqual('1em')
  })
})

describe('addRem', () => {
  it('should add rem', () => {
    expect(addRem(1)).toEqual('1rem')
  })
})
