import {removeItem} from '../'

describe('removeItem', () => {
  it('should remove a fined one', () => {
    const result = removeItem(['foo', 'foo', 'bar'], (value) => {
      return value === 'foo'
    })
    expect(result).toEqual(['foo', 'bar'])
  })
})
