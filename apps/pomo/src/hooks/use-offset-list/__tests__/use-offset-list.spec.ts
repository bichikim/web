/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {expect, it} from 'vitest'

import {useOffsetList} from '..'

interface Row {
  readonly key: number
  readonly title: string
}
const FIRST: Row = {key: 1, title: 'first'}
const SECOND: Row = {key: 2, title: 'second'}

it('should advance raw offsets independently from deduplicated visible rows', () => {
  const {result} = renderHook(() => useOffsetList({getKey: (row: Row) => row.key}))
  result.replacePage([FIRST])
  result.appendPage([FIRST, SECOND, SECOND])
  expect(result.items()).toEqual([FIRST, SECOND])
  expect(result.nextOffset()).toBe(4)
})

it.each([
  {duplicateKey: 1, key: 1, name: 'ordinary'},
  {duplicateKey: Number.NaN, key: Number.NaN, name: 'NaN'},
  {duplicateKey: -0, key: 0, name: 'positive-zero'},
  {duplicateKey: 0, key: -0, name: 'negative-zero'},
])('should keep the first row for duplicate $name keys', ({duplicateKey, key}) => {
  const {result} = renderHook(() => useOffsetList({getKey: (row: Row) => row.key}))
  const first: Row = {key, title: 'first'}
  const duplicate: Row = {key: duplicateKey, title: 'duplicate'}

  result.replacePage([first, duplicate])
  expect(result.items()).toHaveLength(1)
  expect(result.items()[0]).toBe(first)
  expect(result.nextOffset()).toBe(2)

  result.appendPage([duplicate])
  expect(result.items()).toHaveLength(1)
  expect(result.items()[0]).toBe(first)
  expect(result.nextOffset()).toBe(3)

  result.replacePage([duplicate], {retainItems: true})
  expect(result.items()).toHaveLength(1)
  expect(result.items()[0]).toBe(duplicate)
  expect(result.nextOffset()).toBe(1)
})

it('should call key selectors with only each row', () => {
  const {result} = renderHook(() => useOffsetList({getKey: parseInt}))
  result.replacePage(['10', '20', '30'])
  expect(result.items()).toEqual(['10', '20', '30'])
  result.appendPage(['40', '50'])
  expect(result.items()).toEqual(['10', '20', '30', '40', '50'])
  result.replacePage(['60'], {retainItems: true})
  expect(result.items()).toEqual(['60', '10', '20', '30', '40', '50'])
})

it('should retain unmatched rows on replacement and restart the raw offset', () => {
  const {result} = renderHook(() => useOffsetList({getKey: (row: Row) => row.key}))
  result.replacePage([FIRST, SECOND])
  const updated = {...FIRST, title: 'updated'}
  result.replacePage([updated], {retainItems: true})
  expect(result.items()).toEqual([updated, SECOND])
  expect(result.nextOffset()).toBe(1)
  result.replacePage([FIRST])
  expect(result.items()).toEqual([FIRST])
})

it('should update a matching row without mutating its input and reset the list', () => {
  const {result} = renderHook(() => useOffsetList({getKey: (row: Row) => row.key}))
  result.replacePage([FIRST, SECOND])
  result.updateItem(2, (row) => ({...row, title: 'changed'}))
  expect(result.items()).toEqual([FIRST, {...SECOND, title: 'changed'}])
  expect(SECOND.title).toBe('second')
  result.reset()
  expect(result.items()).toEqual([])
  expect(result.nextOffset()).toBe(0)
})
