import {describe, expect, it} from 'vitest'
import {addEm, addPx, addRem, addUnit} from '../'

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
