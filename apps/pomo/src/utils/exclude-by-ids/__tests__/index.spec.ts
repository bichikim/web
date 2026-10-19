import {describe, expect, expectTypeOf, it, vi} from 'vitest'
import {excludeByIds} from '..'

describe('excludeByIds', () => {
  it('should exclude selected numeric ids while retaining item order, duplicates, and identities', () => {
    const first = Object.freeze({code: 1})
    const second = Object.freeze({code: 2})
    const third = Object.freeze({code: 3})
    const values = Object.freeze([first, second, third, first])
    const ids = Object.freeze([2, 2])

    const result = excludeByIds(values, ids, (item) => item.code)

    expect(result).toEqual([first, third, first])
    expect(result[0]).toBe(first)
    expect(result[1]).toBe(third)
    expect(result[2]).toBe(first)
    expect(values).toEqual([first, second, third, first])
    expect(ids).toEqual([2, 2])
  })

  it('should accept primitive items and preserve their inferred type', () => {
    const result = excludeByIds([1, 2, 3, 2], [2], (item) => item)

    expect(result).toEqual([1, 3])
    expectTypeOf(result).toEqualTypeOf<ReadonlyArray<number>>()
  })

  it('should distinguish symbol ids by identity', () => {
    const kept = Symbol('key')
    const excluded = Symbol('key')
    const values = [{key: kept}, {key: excluded}]

    expect(excludeByIds(values, [excluded], (item) => item.key)).toEqual([values[0]])
  })

  it('should retain every item when no ids are excluded', () => {
    const values = [{id: 'a'}, {id: 'b'}]

    expect(excludeByIds(values, [], (item) => item.id)).toEqual(values)
  })

  it('should return no items without calling the selector for an empty input', () => {
    const getId = vi.fn((item: number) => item)

    expect(excludeByIds([], [1], getId)).toEqual([])
    expect(getId).not.toHaveBeenCalled()
  })

  it('should propagate selector failures', () => {
    const failure = new Error('Cannot read id')

    expect(() =>
      excludeByIds([1], [2], () => {
        throw failure
      }),
    ).toThrow(failure)
  })
})
