import {take, takeRight} from '../'

describe('takeFn', () => {
  it('should return 2 items (curry)', () => {
    const target = [1, 2, 3, 4, 5]
    const result = takeRight(2)(target)
    expect(result).toEqual([1, 2])
    expect(target).toEqual([1, 2, 3, 4, 5])
  })
  it('should return 2 items', () => {
    const target = [1, 2, 3, 4, 5]
    const result = takeRight(2, target)
    expect(result).toEqual([1, 2])
    expect(target).toEqual([1, 2, 3, 4, 5])
  })
})

describe('take', () => {
  it('should return 2 items', () => {
    const target = [1, 2, 3, 4, 5]
    const result = take(target, 2)
    expect(result).toEqual([1, 2])
    expect(target).toEqual([1, 2, 3, 4, 5])
  })
})
