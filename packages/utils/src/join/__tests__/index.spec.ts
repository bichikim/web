import {join} from '../'

describe('join', () => {
  it('should join array items', () => {
    expect(join([1, 2, 3])).toBe('1,2,3')
  })
  it('should join array items with separator', () => {
    expect(join([1, 2, 3], '-')).toBe('1-2-3')
  })
})
