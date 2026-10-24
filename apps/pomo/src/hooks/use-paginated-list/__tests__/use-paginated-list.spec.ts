/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {expect, it} from 'vitest'

import {usePaginatedList} from '..'

interface Row {
  readonly key: number
  readonly title: string
}
const FIRST: Row = {key: 1, title: 'first'}
const SECOND: Row = {key: 2, title: 'second'}
const useRows = () =>
  usePaginatedList({
    getItems: (page: ReadonlyArray<Row>) => page,
    getKey: (row) => row.key,
    getNextPageParam: (page, _pages, offset) => offset + page.length,
    initialPageParam: 0,
  })

it('should advance raw offsets independently from deduplicated visible rows', () => {
  const {result} = renderHook(() => useRows())
  result.replacePage([FIRST], 0)
  result.appendPage([FIRST, SECOND, SECOND], 1)
  expect(result.items()).toEqual([FIRST, SECOND])
  expect(result.nextPageParam()).toBe(4)
})

it.each([
  {duplicateKey: 1, key: 1, name: 'ordinary'},
  {duplicateKey: Number.NaN, key: Number.NaN, name: 'NaN'},
  {duplicateKey: -0, key: 0, name: 'positive-zero'},
  {duplicateKey: 0, key: -0, name: 'negative-zero'},
])('should keep the first row for duplicate $name keys', ({duplicateKey, key}) => {
  const {result} = renderHook(() => useRows())
  const first: Row = {key, title: 'first'}
  const duplicate: Row = {key: duplicateKey, title: 'duplicate'}

  result.replacePage([first, duplicate], 0)
  expect(result.items()).toHaveLength(1)
  expect(result.items()[0]).toBe(first)
  expect(result.nextPageParam()).toBe(2)

  result.appendPage([duplicate], 2)
  expect(result.items()).toHaveLength(1)
  expect(result.items()[0]).toBe(first)
  expect(result.nextPageParam()).toBe(3)

  result.replacePage([duplicate], 0, {retainItems: true})
  expect(result.items()).toHaveLength(1)
  expect(result.items()[0]).toBe(duplicate)
  expect(result.nextPageParam()).toBe(1)
})

it('should call key selectors with only each row', () => {
  const {result} = renderHook(() =>
    usePaginatedList({
      getItems: (page: ReadonlyArray<string>) => page,
      getKey: parseInt,
      getNextPageParam: (page, _pages, offset) => offset + page.length,
      initialPageParam: 0,
    }),
  )
  result.replacePage(['10', '20', '30'], 0)
  expect(result.items()).toEqual(['10', '20', '30'])
  result.appendPage(['40', '50'], 3)
  expect(result.items()).toEqual(['10', '20', '30', '40', '50'])
  result.replacePage(['60'], 0, {retainItems: true})
  expect(result.items()).toEqual(['60', '10', '20', '30', '40', '50'])
})

it('should retain unmatched rows on replacement and restart the raw offset', () => {
  const {result} = renderHook(() => useRows())
  result.replacePage([FIRST, SECOND], 0)
  const updated = {...FIRST, title: 'updated'}
  result.replacePage([updated], 0, {retainItems: true})
  expect(result.items()).toEqual([updated, SECOND])
  expect(result.nextPageParam()).toBe(1)
  result.replacePage([FIRST], 0)
  expect(result.items()).toEqual([FIRST])
})

it('should update a matching row without mutating its input and reset the list', () => {
  const {result} = renderHook(() => useRows())
  result.replacePage([FIRST, SECOND], 0)
  result.updateItem(2, (row) => ({...row, title: 'changed'}))
  expect(result.items()).toEqual([FIRST, {...SECOND, title: 'changed'}])
  expect(SECOND.title).toBe('second')
  result.reset()
  expect(result.items()).toEqual([])
  expect(result.nextPageParam()).toBe(0)
})

it('should use cursor and snapshot parameters without deriving them from visible items', () => {
  interface Cursor {
    readonly cursor: string | null
    readonly snapshot: string | null
  }
  interface Page {
    readonly rows: ReadonlyArray<Row>
    readonly next: Cursor | null
  }
  const initial: Cursor = {cursor: null, snapshot: null}
  const next: Cursor = {cursor: 'opaque-next', snapshot: 'snapshot-1'}
  const first: Page = {next, rows: [FIRST, FIRST]}
  const second: Page = {next: null, rows: [FIRST, SECOND]}
  const calls: unknown[] = []
  const {result} = renderHook(() =>
    usePaginatedList({
      getItems: (page: Page) => page.rows,
      getKey: (row) => row.key,
      getNextPageParam: (page, pages, parameter, parameters) => {
        calls.push([page, pages, parameter, parameters])
        return page.next
      },
      initialPageParam: initial,
    }),
  )
  expect(result.nextPageParam()).toBe(initial)
  result.replacePage(first, initial)
  expect(result.nextPageParam()).toBe(next)
  result.appendPage(second, next)
  expect(result.items()).toEqual([FIRST, SECOND])
  expect(result.pages()).toEqual([first, second])
  expect(result.pages()[0]).toBe(first)
  expect(result.pageParams()).toEqual([initial, next])
  expect(calls[1]).toEqual([second, [first, second], next, [initial, next]])
  expect(result.nextPageParam()).toBeNull()
  result.reset()
  expect(result.pages()).toEqual([])
  expect(result.pageParams()).toEqual([])
  expect(result.nextPageParam()).toBe(initial)
  expect(calls).toHaveLength(2)
})

it('should retain display rows without passing them into pagination calculation', () => {
  const {result} = renderHook(useRows)
  result.replacePage([FIRST, SECOND], 40)
  result.replacePage([FIRST], 10, {
    reconcileItems: (_current, incoming) => incoming.map((row) => ({...row, title: 'reconciled'})),
    retainItems: true,
  })
  expect(result.items()).toEqual([{...FIRST, title: 'reconciled'}, SECOND])
  expect(result.pages()).toEqual([[FIRST]])
  expect(result.pageParams()).toEqual([10])
  expect(result.nextPageParam()).toBe(11)
})

it('should update NaN keys using the same identity rule as deduplication', () => {
  const {result} = renderHook(useRows)
  result.replacePage([{key: NaN, title: 'before'}], 0)
  result.updateItem(NaN, (row) => ({...row, title: 'after'}))
  expect(result.items()[0].title).toBe('after')
  expect(result.pages()[0][0].title).toBe('before')
})

it('should accept undefined as the end of the page chain', () => {
  const {result} = renderHook(() =>
    usePaginatedList({
      getItems: (page: ReadonlyArray<Row>) => page,
      getKey: (row) => row.key,
      getNextPageParam: () => undefined,
      initialPageParam: 0,
    }),
  )
  result.replacePage([FIRST], 0)
  expect(result.nextPageParam()).toBeUndefined()
})

it('should memoize pagination calculations independently from display row updates', () => {
  let calculations = 0
  const {result} = renderHook(() =>
    usePaginatedList({
      getItems: (page: ReadonlyArray<Row>) => page,
      getKey: (row) => row.key,
      getNextPageParam: (page, _pages, offset) => {
        calculations += 1
        return offset + page.length
      },
      initialPageParam: 0,
    }),
  )
  result.replacePage([FIRST], 0)
  expect(result.nextPageParam()).toBe(1)
  expect(result.nextPageParam()).toBe(1)
  result.updateItem(FIRST.key, (row) => ({...row, title: 'updated'}))
  expect(result.nextPageParam()).toBe(1)
  expect(calculations).toBe(1)
  result.appendPage([SECOND], 1)
  expect(result.nextPageParam()).toBe(2)
  expect(calculations).toBe(2)
  result.reset()
  expect(result.nextPageParam()).toBe(0)
  expect(calculations).toBe(2)
})
