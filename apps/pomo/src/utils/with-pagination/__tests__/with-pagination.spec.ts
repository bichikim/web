/** @vitest-environment jsdom */

import {query} from '@solidjs/router'
import {afterEach, expect, it, vi} from 'vitest'

import {withPagination} from '..'

afterEach(() => query.clear())

it('should preserve calls, cache identities and invalidation while attaching pagination rules', async () => {
  const load = vi.fn(async (_scope: string, offset: number) => ({next: offset + 2}))
  const source = query(load, 'wrapped-pages')
  const wrapped = withPagination(source, {
    getNextPageParam: (page) => page.next,
    initialPageParam: 0,
  })

  expect(await wrapped('reader', 2)).toEqual({next: 4})
  expect(await source('reader', 2)).toEqual({next: 4})
  expect(load).toHaveBeenCalledExactlyOnceWith('reader', 2)
  expect(wrapped.key).toBe(source.key)
  expect(wrapped.keyFor('reader', 2)).toBe(source.keyFor('reader', 2))
  expect(wrapped.getNextPageParam({next: 4}, [{next: 4}], 2, [2])).toBe(4)
  expect('initialPageParam' in source).toBe(false)

  query.delete(wrapped.keyFor('reader', 2))
  await wrapped('reader', 2)
  expect(load).toHaveBeenCalledTimes(2)
})

it('should forward multiple query arguments and object page parameters without changing their identity', async () => {
  interface Parameter {
    readonly cursor: string
    readonly snapshot: string
  }
  const parameter: Parameter = {cursor: 'next', snapshot: 'version-1'}
  const load = vi.fn(async (_scope: string, _filter: number, pageParam: Parameter) => ({pageParam}))
  const wrapped = withPagination(query(load, 'object-pages'), {
    getNextPageParam: () => undefined,
    initialPageParam: parameter,
  })
  const page = await wrapped('reader', 3, parameter)
  expect(load).toHaveBeenCalledExactlyOnceWith('reader', 3, parameter)
  expect(page.pageParam).toBe(parameter)
  expect(wrapped.initialPageParam).toBe(parameter)
  expect(wrapped.getNextPageParam(page, [page], parameter, [parameter])).toBeUndefined()
})
