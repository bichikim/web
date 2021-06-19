import {cleanObject} from '../index'

describe('cleanObject', function test() {
  it('should return clean object', function test() {
    const result = cleanObject({bar: undefined, foo: 'foo'})

    expect(result).toEqual({foo: 'foo'})
  })
})
