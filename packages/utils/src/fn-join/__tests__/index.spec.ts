import {fnJoin} from '../'

describe('fnJoin', () => {
  it('should join array items as curry function', () => {
    const array = [1, 2, 3]
    const join = fnJoin()
    expect(join(array)).toBe('1,2,3')
  })
  it('should join array items with separator as curry function', () => {
    const array = [1, 2, 3]
    const join = fnJoin('-')
    expect(join(array)).toBe('1-2-3')
  })
})
