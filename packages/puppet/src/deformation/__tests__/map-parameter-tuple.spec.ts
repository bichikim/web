import {expect, it} from 'vitest'
import {mapParameterTuple} from '../map-parameter-tuple'

it('should map a single axis without changing the source', () => {
  const values = [3] as const

  expect(mapParameterTuple(values, (value, index) => `${index}:${value}`)).toEqual(['0:3'])
  expect(values).toEqual([3])
})

it('should map two axes in order with their original indices', () => {
  expect(mapParameterTuple(['x', 'y'], (value, index) => `${index}:${value}`)).toEqual([
    '0:x',
    '1:y',
  ])
})

it('should map three axes in order with their original indices', () => {
  expect(mapParameterTuple([2, 4, 6], (value, index) => value + index)).toEqual([2, 5, 8])
})
