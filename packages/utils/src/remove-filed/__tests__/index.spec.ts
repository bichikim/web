import {removeField} from '../'

describe('removeItem', () => {
  it('should remove a fined one', () => {
    const result = removeField(['foo', 'foo', 'bar'], (value) => {
      return value === 'foo'
    })
    expect(result).toEqual(['foo', 'bar'])
  })
})
