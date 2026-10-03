/** @vitest-environment jsdom */

import {batch, createEffect, createRoot, createSignal} from 'solid-js'
import {afterEach, beforeEach, describe, expect, expectTypeOf, it, vi} from 'vitest'

import {useAsyncSearch, type UseAsyncSearchProps} from '../index'

interface SearchItem {
  readonly name: string
}

interface SearchRootOptions extends Omit<UseAsyncSearchProps<SearchItem>, 'query'> {
  readonly initialQuery?: string
}

const disposers: Array<() => void> = []
const tokyo: SearchItem = {name: 'Tokyo'}
const london: SearchItem = {name: 'London'}

const createSearchRoot = (options: SearchRootOptions) => {
  const root = createRoot((dispose) => {
    const [query, setQuery] = createSignal(options.initialQuery ?? '', {equals: false})
    const controller = useAsyncSearch({delayMs: 30, minLength: 2, ...options, query})
    return {controller, dispose, setQuery}
  })
  disposers.push(root.dispose)
  return root
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  disposers.splice(0).forEach((dispose) => dispose())
  vi.useRealTimers()
})

describe('useAsyncSearch', () => {
  it('should expose idle results and infer the search item type', () => {
    const root = createSearchRoot({search: vi.fn()})

    expect(root.controller.status()).toBe('idle')
    expect(root.controller.results()).toEqual([])
    expectTypeOf(root.controller.results()).toEqualTypeOf<ReadonlyArray<SearchItem>>()
  })

  it('should default to a 300ms delay and a one-character minimum', async () => {
    const search = vi.fn().mockResolvedValue([tokyo])
    const root = createSearchRoot({delayMs: undefined, minLength: undefined, search})

    root.setQuery(' T ')
    await vi.advanceTimersByTimeAsync(299)
    expect(search).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)

    expect(search).toHaveBeenCalledExactlyOnceWith('T', expect.any(AbortSignal))
    expect(root.controller.status()).toBe('ready')
  })

  it('should trim and debounce the latest query using the configured delay', async () => {
    const search = vi.fn().mockResolvedValue([tokyo])
    const root = createSearchRoot({delayMs: 50, search})

    root.setQuery('To')
    await vi.advanceTimersByTimeAsync(20)
    root.setQuery(' Tokyo ')
    expect(root.controller.status()).toBe('searching')
    await vi.advanceTimersByTimeAsync(49)
    expect(search).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)

    expect(search).toHaveBeenCalledExactlyOnceWith('Tokyo', expect.any(AbortSignal))
    expect(root.controller.results()).toEqual([tokyo])
    expect(root.controller.status()).toBe('ready')
  })

  it('should debounce an initial query and respect the configured minimum length', async () => {
    const search = vi.fn().mockResolvedValue([])
    const root = createSearchRoot({initialQuery: ' ab ', minLength: 3, search})

    expect(root.controller.status()).toBe('input-required')
    await vi.advanceTimersByTimeAsync(30)
    expect(search).not.toHaveBeenCalled()
    root.setQuery(' abc ')
    await vi.advanceTimersByTimeAsync(30)

    expect(search).toHaveBeenCalledExactlyOnceWith('abc', expect.any(AbortSignal))
    expect(root.controller.results()).toEqual([])
    expect(root.controller.status()).toBe('ready')
  })

  it.each([
    {query: ' ', status: 'idle'},
    {query: 'T', status: 'input-required'},
  ])('should cancel a queued search for $status input', async ({query, status}) => {
    const search = vi.fn()
    const root = createSearchRoot({search})

    root.setQuery('Tokyo')
    root.setQuery(query)
    await vi.advanceTimersByTimeAsync(30)

    expect(search).not.toHaveBeenCalled()
    expect(root.controller.results()).toEqual([])
    expect(root.controller.status()).toBe(status)
  })

  it('should clear existing results immediately when the query changes', async () => {
    const root = createSearchRoot({search: vi.fn().mockResolvedValue([tokyo])})
    root.setQuery('Tokyo')
    await vi.advanceTimersByTimeAsync(30)
    expect(root.controller.results()).toEqual([tokyo])

    root.setQuery('London')

    expect(root.controller.results()).toEqual([])
    expect(root.controller.status()).toBe('searching')
  })

  it('should abort and invalidate a request before the next debounce completes', async () => {
    const first = Promise.withResolvers<ReadonlyArray<SearchItem>>()
    const search = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValueOnce([london])
    const root = createSearchRoot({search})

    root.setQuery('Tokyo')
    await vi.advanceTimersByTimeAsync(30)
    const firstSignal = search.mock.calls[0]?.[1]
    root.setQuery('London')
    expect(firstSignal.aborted).toBe(true)
    first.resolve([tokyo])
    await vi.advanceTimersByTimeAsync(0)

    expect(search).toHaveBeenCalledTimes(1)
    expect(root.controller.results()).toEqual([])
    expect(root.controller.status()).toBe('searching')
    await vi.advanceTimersByTimeAsync(30)
    expect(root.controller.results()).toEqual([london])
  })

  it.each(['resolve', 'reject'] as const)(
    'should ignore a stale %s after a newer request succeeds',
    async (settlement) => {
      const first = Promise.withResolvers<ReadonlyArray<SearchItem>>()
      const search = vi.fn().mockReturnValueOnce(first.promise).mockResolvedValueOnce([london])
      const root = createSearchRoot({search})

      root.setQuery('Tokyo')
      await vi.advanceTimersByTimeAsync(30)
      root.setQuery('London')
      await vi.advanceTimersByTimeAsync(30)
      if (settlement === 'resolve') {
        first.resolve([tokyo])
      } else {
        first.reject(new Error('stale failure'))
      }
      await vi.advanceTimersByTimeAsync(0)

      expect(root.controller.results()).toEqual([london])
      expect(root.controller.status()).toBe('ready')
    },
  )

  it.each([
    {query: '', status: 'idle'},
    {query: 'T', status: 'input-required'},
  ])(
    'should abort active work for $status input and ignore its rejection',
    async ({query, status}) => {
      const request = Promise.withResolvers<ReadonlyArray<SearchItem>>()
      const search = vi.fn().mockReturnValue(request.promise)
      const root = createSearchRoot({search})

      root.setQuery('Tokyo')
      await vi.advanceTimersByTimeAsync(30)
      root.setQuery(query)
      expect(search.mock.calls[0]?.[1].aborted).toBe(true)
      request.reject(new Error('aborted'))
      await vi.advanceTimersByTimeAsync(30)

      expect(search).toHaveBeenCalledTimes(1)
      expect(root.controller.results()).toEqual([])
      expect(root.controller.status()).toBe(status)
    },
  )

  it('should expose a rejected search and recover on the next query', async () => {
    const search = vi
      .fn()
      .mockRejectedValueOnce(new Error('unavailable'))
      .mockResolvedValue([tokyo])
    const root = createSearchRoot({search})

    root.setQuery('Tokyo')
    await vi.advanceTimersByTimeAsync(30)
    expect(root.controller.results()).toEqual([])
    expect(root.controller.status()).toBe('error')
    root.setQuery('Tokyo')
    expect(root.controller.status()).toBe('searching')
    await vi.advanceTimersByTimeAsync(30)
    expect(root.controller.status()).toBe('ready')
  })

  it('should expose synchronous provider exceptions through error status', async () => {
    const root = createSearchRoot({
      search: () => {
        throw new Error('unavailable')
      },
    })

    root.setQuery('Tokyo')
    await vi.advanceTimersByTimeAsync(30)

    expect(root.controller.results()).toEqual([])
    expect(root.controller.status()).toBe('error')
  })

  it('should reset an initial query before the first effect runs', async () => {
    const search = vi.fn().mockResolvedValue([tokyo])
    const controller = createRoot((dispose) => {
      disposers.push(dispose)
      const controller = useAsyncSearch({delayMs: 30, query: () => 'Tokyo', search})
      controller.reset()
      return controller
    })

    await vi.advanceTimersByTimeAsync(30)

    expect(search).not.toHaveBeenCalled()
    expect(controller.results()).toEqual([])
    expect(controller.status()).toBe('idle')
  })

  it('should keep reset effective when a query change is batched with it', async () => {
    const search = vi.fn().mockResolvedValue([tokyo])
    const root = createSearchRoot({search})

    batch(() => {
      root.setQuery('Tokyo')
      root.controller.reset()
    })
    await vi.advanceTimersByTimeAsync(30)

    expect(search).not.toHaveBeenCalled()
    expect(root.controller.results()).toEqual([])
    expect(root.controller.status()).toBe('idle')
  })

  it('should search a query changed after reset in the same batch', async () => {
    const search = vi.fn().mockResolvedValue([london])
    const root = createSearchRoot({search})
    root.setQuery('Tokyo')

    batch(() => {
      root.controller.reset()
      root.setQuery('London')
    })
    await vi.advanceTimersByTimeAsync(30)

    expect(search).toHaveBeenCalledExactlyOnceWith('London', expect.any(AbortSignal))
    expect(root.controller.results()).toEqual([london])
    expect(root.controller.status()).toBe('ready')
  })

  it('should not subscribe an effect calling reset to query changes', async () => {
    const search = vi.fn().mockResolvedValue([tokyo])
    const resetEffect = vi.fn()
    const root = createRoot((dispose) => {
      disposers.push(dispose)
      const [query, setQuery] = createSignal('')
      const controller = useAsyncSearch({delayMs: 30, query, search})
      createEffect(() => {
        resetEffect()
        controller.reset()
      })
      return {controller, setQuery}
    })

    root.setQuery('Tokyo')
    await vi.advanceTimersByTimeAsync(30)

    expect(resetEffect).toHaveBeenCalledTimes(1)
    expect(search).toHaveBeenCalledExactlyOnceWith('Tokyo', expect.any(AbortSignal))
    expect(root.controller.status()).toBe('ready')
  })

  it('should reset a queued search without modifying caller-owned input', async () => {
    const search = vi.fn().mockResolvedValue([tokyo])
    const root = createSearchRoot({search})

    root.setQuery('Tokyo')
    root.controller.reset()
    await vi.advanceTimersByTimeAsync(30)
    expect(search).not.toHaveBeenCalled()
    expect(root.controller.status()).toBe('idle')
    root.setQuery('Tokyo')
    await vi.advanceTimersByTimeAsync(30)
    expect(root.controller.results()).toEqual([tokyo])
  })

  it('should reset an active search and reject late publication', async () => {
    const request = Promise.withResolvers<ReadonlyArray<SearchItem>>()
    const search = vi.fn().mockReturnValueOnce(request.promise)
    const root = createSearchRoot({search})

    root.setQuery('Tokyo')
    await vi.advanceTimersByTimeAsync(30)
    root.controller.reset()
    expect(search.mock.calls[0]?.[1].aborted).toBe(true)
    request.resolve([tokyo])
    await vi.advanceTimersByTimeAsync(0)

    expect(root.controller.results()).toEqual([])
    expect(root.controller.status()).toBe('idle')
  })

  it('should clear completed results on reset', async () => {
    const root = createSearchRoot({search: vi.fn().mockResolvedValue([tokyo])})
    root.setQuery('Tokyo')
    await vi.advanceTimersByTimeAsync(30)
    root.controller.reset()

    expect(root.controller.results()).toEqual([])
    expect(root.controller.status()).toBe('idle')
  })

  it('should cancel queued work on disposal', async () => {
    const search = vi.fn()
    const root = createSearchRoot({search})

    root.setQuery('Tokyo')
    root.dispose()
    await vi.advanceTimersByTimeAsync(30)

    expect(search).not.toHaveBeenCalled()
  })

  it.each(['resolve', 'reject'] as const)(
    'should abort active work and ignore its %s after disposal',
    async (settlement) => {
      const request = Promise.withResolvers<ReadonlyArray<SearchItem>>()
      const search = vi.fn().mockReturnValue(request.promise)
      const root = createSearchRoot({search})

      root.setQuery('Tokyo')
      await vi.advanceTimersByTimeAsync(30)
      root.dispose()
      expect(search.mock.calls[0]?.[1].aborted).toBe(true)
      const status = root.controller.status()
      const results = root.controller.results()
      if (settlement === 'resolve') {
        request.resolve([tokyo])
      } else {
        request.reject(new Error('disposed failure'))
      }
      await vi.advanceTimersByTimeAsync(0)

      expect(root.controller.results()).toBe(results)
      expect(root.controller.status()).toBe(status)
    },
  )
})
