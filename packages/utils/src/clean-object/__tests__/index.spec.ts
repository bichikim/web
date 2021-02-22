import {cleanObject} from '../index'

describe('cleanObject', function test() {
  it('should return clean object', function test() {
    const result = cleanObject({foo: 'foo', bar: undefined})

    expect(result).toEqual({foo: 'foo'})
  })
})
