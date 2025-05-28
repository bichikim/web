import {take, takeFn} from '../'
import {describe, expect, it} from 'vitest'

export type ObjectInfer<T> = T extends {[key: string]: infer U} ? {[P in keyof T]: T[P]} : T

describe('takeFn', () => {
  it('should return 2 items (curry)', () => {
    const target = [1, 2, 3, 4, 5]
    const result = takeFn(2)(target)

    expect(result).toEqual([1, 2])
    expect(target).toEqual([1, 2, 3, 4, 5])
  })

  it('should return 2 items', () => {
    const target = [1, 2, 3, 4, 5]
    const result = takeFn(2, target)

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
