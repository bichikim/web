import {cleanObject} from '../'

describe('cleanObject', () => {
  it('should return a cleaned object', () => {
    const result = cleanObject({bar: undefined, foo: 'foo'})

    expect(result).toEqual({foo: 'foo'})
  })
})
