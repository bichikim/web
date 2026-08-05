/**
 * @vitest-environment jsdom
 */
import {renderHook} from '@solidjs/testing-library'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {withHandyQuery} from '../index'

const routerMocks = vi.hoisted(() => ({
  createAsync: vi.fn(),
  pendingRequests: [] as Array<Promise<unknown>>,
  revalidate: vi.fn(),
}))

vi.mock('@solidjs/router', () => ({
  createAsync: (source: () => Promise<unknown>) => {
    routerMocks.createAsync(source)
    const request = source()
    routerMocks.pendingRequests.push(request)
    request.catch(() => undefined)

    return () => undefined
  },
  revalidate: routerMocks.revalidate,
}))

describe('withHandyQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    routerMocks.pendingRequests.length = 0
  })

  it('should clear loading when a query rejects', async () => {
    const query = Object.assign(vi.fn().mockRejectedValue(new Error('failed')), {
      key: 'query',
      keyFor: vi.fn(),
    })
    const useQuery = withHandyQuery(query)
    const {result} = renderHook(() => useQuery())

    expect(result.loading()).toBe(true)
    await routerMocks.pendingRequests[0]?.then(() => undefined).catch(() => undefined)

    expect(result.loading()).toBe(false)
  })

  it('should stay loading until overlapping queries have both settled', async () => {
    let resolveFirst: (() => void) | undefined
    let resolveSecond: (() => void) | undefined
    const query = Object.assign(
      vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise<void>((resolve) => {
              resolveFirst = resolve
            }),
        )
        .mockImplementationOnce(
          () =>
            new Promise<void>((resolve) => {
              resolveSecond = resolve
            }),
        ),
      {key: 'query', keyFor: vi.fn()},
    )
    const useQuery = withHandyQuery(query)
    const {result} = renderHook(() => useQuery())
    const source = routerMocks.createAsync.mock.calls[0]?.[0] as () => Promise<unknown>
    const secondRequest = source()

    resolveFirst?.()
    await routerMocks.pendingRequests[0]
    expect(result.loading()).toBe(true)

    resolveSecond?.()
    await secondRequest
    expect(result.loading()).toBe(false)
  })
})
