import {map, mapFn} from '../'

describe('map', () => {
  it('should return new array', () => {
    const resource = ['foo', 'bar']
    const result = map(resource, (item) => `${item}1`)
    expect(result).toEqual(['foo1', 'bar1'])
    expect(Object.is(result, resource)).toBeFalsy()
  })
})

describe('mapFn', () => {
  it('should return new array', () => {
    const resource = ['foo', 'bar']
    const result = mapFn((item) => `${item}1`)(resource)
    expect(result).toEqual(['foo1', 'bar1'])
    expect(Object.is(result, resource)).toBeFalsy()
  })
})
