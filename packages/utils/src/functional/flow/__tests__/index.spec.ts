import {flow} from '../'

describe('flow', () => {
  it('should call all functions', () => {
    const func = flow(
      (aValue: number, bValue: number) => {
        return aValue + bValue
      },
      (aValue: number) => {
        return aValue + 1
      },
    )
    expect(func(1, 2)).toBe(4)
  })
})
