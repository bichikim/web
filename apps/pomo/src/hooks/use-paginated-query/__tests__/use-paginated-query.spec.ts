/** @vitest-environment jsdom */

import {MemoryRouter, query} from '@solidjs/router'
import {renderHook} from '@solidjs/testing-library'
import {batch, createComponent, createSignal, type ParentComponent} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'

import {withPagination} from 'src/utils/with-pagination'
import {usePaginatedQuery} from '..'

interface Page {
  readonly rows: ReadonlyArray<number>
  readonly next: string | null
}

afterEach(() => query.clear())

it('should keep a refresh started during owner creation instead of cancelling it during initialization', async () => {
  const pending = Promise.withResolvers<Page>()
  const load = vi.fn((_cursor: string) => pending.promise)
  const pageQuery = withPagination(query(load, 'initial-refresh'), {
    getNextPageParam: (page) => page.next,
    initialPageParam: 'first',
  })
  const RouterWrapper: ParentComponent = (props) =>
    createComponent(MemoryRouter, {root: () => props.children})
  const {result} = renderHook(
    () => {
      const list = usePaginatedQuery({
        args: () => [],
        getItems: (page: Page) => page.rows,
        getKey: (row) => row,
        query: pageQuery,
      })
      const refresh = list.refresh({invalidate: false})
      return {list, refresh}
    },
    {wrapper: RouterWrapper},
  )

  const loading = result.list.isLoading()
  pending.resolve({next: null, rows: [1]})
  expect(await result.refresh).toMatchObject({status: 'loaded'})
  expect(loading).toBe(true)
  expect(result.list.items()).toEqual([1])
})

it('should accept a refresh for new arguments started in the same batch as their update', async () => {
  const load = vi.fn(
    async (_scope: string, _cursor: string): Promise<Page> => ({next: null, rows: [1]}),
  )
  const pageQuery = withPagination(query(load, 'batched-refresh'), {
    getNextPageParam: (page) => page.next,
    initialPageParam: 'first',
  })
  const [scope, setScope] = createSignal('before')
  const {result} = renderHook(() =>
    usePaginatedQuery({
      args: () => [scope()],
      getItems: (page: Page) => page.rows,
      getKey: (row) => row,
      query: pageQuery,
    }),
  )
  const refresh = batch(() => {
    setScope('after')
    return result.refresh({invalidate: false})
  })
  expect(await refresh).toMatchObject({status: 'loaded'})
  expect(result.items()).toEqual([1])
  expect(load).toHaveBeenCalledExactlyOnceWith('after', 'first')
})

it('should restart the page parameter when loading more after a batched argument change', async () => {
  const load = vi.fn(
    async (_scope: string, _cursor: string): Promise<Page> => ({next: 'second', rows: [1]}),
  )
  load
    .mockResolvedValueOnce({next: 'second', rows: [1]})
    .mockResolvedValueOnce({next: null, rows: [2]})
  const pageQuery = withPagination(query(load, 'batched-append'), {
    getNextPageParam: (page) => page.next,
    initialPageParam: 'first',
  })
  const [scope, setScope] = createSignal('before')
  const {result} = renderHook(() =>
    usePaginatedQuery({
      args: () => [scope()],
      getItems: (page: Page) => page.rows,
      getKey: (row) => row,
      query: pageQuery,
    }),
  )
  await result.refresh({invalidate: false})
  const append = batch(() => {
    setScope('after')
    return result.loadMore()
  })
  expect(await append).toMatchObject({status: 'loaded'})
  expect(load).toHaveBeenNthCalledWith(2, 'after', 'first')
  expect(result.items()).toEqual([2])
  expect(result.pageParams()).toEqual(['first'])
})

it('should keep cursor pages and display state separate for each hook instance', async () => {
  const load = vi.fn(
    async (_scope: string, cursor: string): Promise<Page> =>
      cursor === 'first' ? {next: 'second', rows: [1, 1]} : {next: null, rows: [1, 2]},
  )
  const pageQuery = withPagination(query(load, 'cursor-pages'), {
    getNextPageParam: (page) => page.next,
    initialPageParam: 'first',
  })
  const {result} = renderHook(() => {
    const props = {
      args: (): [string] => ['reader'],
      getItems: (page: Page) => page.rows,
      getKey: (row: number) => row,
      query: pageQuery,
    }
    return {first: usePaginatedQuery(props), second: usePaginatedQuery(props)}
  })

  await Promise.all([
    result.first.refresh({invalidate: false}),
    result.second.refresh({invalidate: false}),
  ])
  await result.first.loadMore()
  expect(result.first.items()).toEqual([1, 2])
  expect(result.first.pageParams()).toEqual(['first', 'second'])
  expect(result.first.pages()[0].rows).toEqual([1, 1])
  expect(result.second.items()).toEqual([1])
  expect(result.second.pageParams()).toEqual(['first'])
  expect(result.first.nextPageParam()).toBeNull()
  await result.first.loadMore()
  expect(load).toHaveBeenCalledTimes(2)
})

it('should discard pending pages after arguments change or the owner is disposed', async () => {
  const first = Promise.withResolvers<Page>()
  const second = Promise.withResolvers<Page>()
  const load = vi.fn((_scope: string, _cursor: string) => first.promise)
  load.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
  const pageQuery = withPagination(query(load, 'pending-pages'), {
    getNextPageParam: (page) => page.next,
    initialPageParam: 'first',
  })
  const [scope, setScope] = createSignal('before')
  const {result, cleanup} = renderHook(() =>
    usePaginatedQuery({
      args: () => [scope()],
      getItems: (page: Page) => page.rows,
      getKey: (row) => row,
      query: pageQuery,
    }),
  )
  const old = result.refresh({invalidate: false})
  setScope('after')
  const current = result.refresh({invalidate: false})
  first.resolve({next: null, rows: [1]})
  expect(await old).toEqual({status: 'cancelled'})
  expect(result.items()).toEqual([])
  cleanup()
  second.resolve({next: null, rows: [2]})
  expect(await current).toEqual({status: 'cancelled'})
  expect(result.items()).toEqual([])
})

it('should report load failures and retry the failed page without losing existing rows', async () => {
  const load = vi.fn(
    async (_scope: string, _cursor: string): Promise<Page> => ({next: 'second', rows: [1]}),
  )
  load
    .mockResolvedValueOnce({next: 'second', rows: [1]})
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({next: null, rows: [2]})
  const pageQuery = withPagination(query(load, 'retry-pages'), {
    getNextPageParam: (page) => page.next,
    initialPageParam: 'first',
  })
  const {result} = renderHook(() =>
    usePaginatedQuery({
      args: () => ['reader'],
      getItems: (page: Page) => page.rows,
      getKey: (row) => row,
      query: pageQuery,
    }),
  )
  await result.refresh({invalidate: false})
  expect(await result.loadMore()).toEqual({status: 'failed'})
  expect(result.loadMoreFailed()).toBe(true)
  expect(result.items()).toEqual([1])
  expect(result.isLoadingMore()).toBe(false)
  await result.loadMore()
  expect(result.loadMoreFailed()).toBe(false)
  expect(result.items()).toEqual([1, 2])
  expect(load).toHaveBeenNthCalledWith(3, 'reader', 'second')
})

it('should discard an append superseded by refresh and skip concurrent append requests', async () => {
  const pending = Promise.withResolvers<Page>()
  const load = vi.fn(async (_cursor: string): Promise<Page> => ({next: 'second', rows: [1]}))
  load
    .mockResolvedValueOnce({next: 'second', rows: [1]})
    .mockReturnValueOnce(pending.promise)
    .mockResolvedValueOnce({next: null, rows: [3]})
  const pageQuery = withPagination(query(load, 'refresh-race'), {
    getNextPageParam: (page) => page.next,
    initialPageParam: 'first',
  })
  const {result} = renderHook(() =>
    usePaginatedQuery({
      args: () => [],
      getItems: (page: Page) => page.rows,
      getKey: (row) => row,
      query: pageQuery,
    }),
  )
  await result.refresh({invalidate: false})
  const append = result.loadMore()
  expect(result.isLoadingMore()).toBe(true)
  expect(await result.loadMore()).toEqual({status: 'skipped'})
  await result.refresh()
  pending.resolve({next: null, rows: [2]})
  expect(await append).toEqual({status: 'cancelled'})
  expect(result.items()).toEqual([3])
  expect(result.pageParams()).toEqual(['first'])
  expect(result.isLoading()).toBe(false)
  expect(result.isLoadingMore()).toBe(false)
})

it('should preserve rows after a failed refresh and clear failure on a successful refresh', async () => {
  const load = vi.fn(async (_cursor: string): Promise<Page> => ({next: null, rows: [1]}))
  load
    .mockResolvedValueOnce({next: null, rows: [1]})
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValueOnce({next: null, rows: [2]})
  const pageQuery = withPagination(query(load, 'refresh-failure'), {
    getNextPageParam: (page) => page.next,
    initialPageParam: 'first',
  })
  const {result} = renderHook(() =>
    usePaginatedQuery({
      args: () => [],
      getItems: (page: Page) => page.rows,
      getKey: (row) => row,
      query: pageQuery,
    }),
  )
  await result.refresh({invalidate: false})
  expect(await result.refresh()).toEqual({status: 'failed'})
  expect(result.loadFailed()).toBe(true)
  expect(result.isLoading()).toBe(false)
  expect(result.items()).toEqual([1])
  await result.refresh({retainItems: true})
  expect(result.loadFailed()).toBe(false)
  expect(result.items()).toEqual([2, 1])
  expect(result.pages()[0].rows).toEqual([2])
})
