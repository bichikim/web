import {last} from '../'

describe('last', () => {
  it('should return last item of the array', () => {
    expect(last([1, 2, 3, 4, 5])).toBe(5)
  })
  it('should return last item of having one array', () => {
    expect(last([1])).toBe(1)
  })
  it('should return last item of the empty array', () => {
    expect(last([])).toBeUndefined()
  })
})
