import {expect, it, vi} from 'vitest'

import {selectMaximumBy} from '..'

it('should select the larger rank and retain the first value on ties', () => {
  const first = {name: 'first', rank: 3}
  const second = {name: 'second', rank: 5}
  const tied = {name: 'tied', rank: 3}
  const rank = (value: typeof first) => value.rank
  expect(selectMaximumBy(first, second, rank)).toBe(second)
  expect(selectMaximumBy(second, first, rank)).toBe(second)
  expect(selectMaximumBy(first, tied, rank)).toBe(first)
})

it('should preserve absence without evaluating missing values', () => {
  const value = {rank: 3}
  const rank = vi.fn((entry: typeof value) => entry.rank)
  expect(selectMaximumBy(null, null, rank)).toBeNull()
  expect(selectMaximumBy(value, null, rank)).toBe(value)
  expect(selectMaximumBy(null, value, rank)).toBe(value)
  expect(rank).not.toHaveBeenCalled()
})

it('should evaluate each comparison value once', () => {
  const rank = vi.fn((value: number) => value)
  expect(selectMaximumBy(1, 2, rank)).toBe(2)
  expect(rank.mock.calls).toEqual([[1], [2]])
})
