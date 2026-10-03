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
