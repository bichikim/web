import {map, mapOp} from '../'
import {describe, it, expect} from 'vitest'
describe('map', () => {
  it('should return new array', () => {
    const resource = ['foo', 'bar']
    const result = map(resource, (item) => `${item}1`)
    expect(result).toEqual(['foo1', 'bar1'])
    expect(Object.is(result, resource)).toBeFalsy()
  })
  it('should return new array (curry)', () => {
    const resource = ['foo', 'bar']
    const result = map(resource)((item) => `${item}1`)
    expect(result).toEqual(['foo1', 'bar1'])
    expect(Object.is(result, resource)).toBeFalsy()
  })
})

describe('mapOp', () => {
  it('should return new array (curry)', () => {
    const resource = ['foo', 'bar']
    const result = mapOp((item) => `${item}1`)(resource)
    expect(result).toEqual(['foo1', 'bar1'])
    expect(Object.is(result, resource)).toBeFalsy()
  })
  it('should return new array', () => {
    const resource = ['foo', 'bar']
    const result = mapOp((item) => `${item}1`, resource)
    expect(result).toEqual(['foo1', 'bar1'])
    expect(Object.is(result, resource)).toBeFalsy()
  })
})
