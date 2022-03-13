/* eslint-disable id-length */
import {flow} from '../flow'

describe('flow', () => {
  it('should call all functions', () => {
    const func = flow(
      (a: number, b: number) => {
        return a + b
      },
      (a: number) => {
        return a + 1
      },
    )
    expect(func(1, 2)).toBe(4)
  })
})
