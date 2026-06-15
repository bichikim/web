import {describe, expect, expectTypeOf, it} from 'vitest'
import {addEm, addPx, addRem, addUnit, addUnitFn, addUnitRight} from '../'

describe('addUnitFn type check', () => {
  it('should match reverse-curried addUnit', () => {
    const partial = addUnitFn('px')

    expectTypeOf(partial).parameters.toEqualTypeOf<[unknown]>()
    expectTypeOf(partial).returns.toEqualTypeOf<string>()
    expectTypeOf(addUnitFn('px', 1)).toEqualTypeOf<string>()
  })
})

describe('addUnit', () => {
  it('should return unit string with number', () => {
    expect(addUnit(1, 'px')).toEqual('1px')
  })

  it('should return unit string with number string', () => {
    expect(addUnit('1', 'px')).toEqual('1px')
  })

  it('should return unit string with string', () => {
    expect(addUnit('1px', 'px')).toEqual('0px')
  })

  it('should return unit string with object', () => {
    expect(addUnit({foo: 'foo'}, 'px')).toEqual('0px')
  })

  it('should return unit string with object', () => {
    expect(addUnit([1, 2], 'px')).toEqual('0px')
  })

  it('should return unit string without unit', () => {
    expect(addUnit(1)).toEqual('1')
  })

  it('should support direct right-call with zero values', () => {
    expect(addUnitRight('px', 0)).toEqual('0px')
  })
})

describe('toPx', () => {
  it('should add px', () => {
    expect(addPx(1)).toEqual('1px')
  })

  it('should add em', () => {
    expect(addEm(1)).toEqual('1em')
  })

  it('should add em', () => {
    expect(addRem(1)).toEqual('1rem')
  })
})

describe('addRem', () => {
  it('should add px', () => {
    expect(addRem(1)).toEqual('1rem')
  })

  it('should add em', () => {
    expect(addRem(1)).toEqual('1rem')
  })

  it('should add em', () => {
    expect(addRem(1)).toEqual('1rem')
  })
})
