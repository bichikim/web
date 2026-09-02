/** @vitest-environment jsdom */

import {createRoot} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

const clientMocks = vi.hoisted(() => ({searchWeatherLocations: vi.fn()}))

vi.mock('../location-client', () => ({searchWeatherLocations: clientMocks.searchWeatherLocations}))

import {useWeatherLocationSearch} from '../use-location-search'

const tokyo = {
  country: 'JP',
  id: 'openweather:35.6900,139.6900',
  name: 'Tokyo',
  region: 'Tokyo',
} as const

const createSearchRoot = () => {
  let dispose: () => void = () => undefined
  const controller = createRoot((disposeRoot) => {
    dispose = disposeRoot
    return useWeatherLocationSearch()
  })
  return {controller, dispose}
}

beforeEach(() => {
  vi.useFakeTimers()
  clientMocks.searchWeatherLocations.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
})

it('should wait for a meaningful debounced query before searching', async () => {
  clientMocks.searchWeatherLocations.mockResolvedValue([tokyo])
  const root = createSearchRoot()

  root.controller.onQueryChange(' t ')
  expect(root.controller.status()).toBe('idle')
  root.controller.onQueryChange(' Tokyo ')
  expect(root.controller.status()).toBe('searching')

  await vi.advanceTimersByTimeAsync(299)
  expect(clientMocks.searchWeatherLocations).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(1)

  expect(clientMocks.searchWeatherLocations).toHaveBeenCalledWith({
    query: 'Tokyo',
    signal: expect.any(AbortSignal),
  })
  expect(root.controller.results()).toEqual([tokyo])
  expect(root.controller.status()).toBe('ready')
  root.dispose()
})

it('should clear a pending debounce when the query becomes too short', async () => {
  const root = createSearchRoot()

  root.controller.onQueryChange('Tokyo')
  root.controller.onQueryChange('T')
  await vi.advanceTimersByTimeAsync(300)

  expect(clientMocks.searchWeatherLocations).not.toHaveBeenCalled()
  expect(root.controller.status()).toBe('idle')
  root.dispose()
})

it('should clear stale results before searching for a new query', async () => {
  clientMocks.searchWeatherLocations.mockResolvedValue([tokyo])
  const root = createSearchRoot()

  root.controller.onQueryChange('Tokyo')
  await vi.advanceTimersByTimeAsync(300)
  expect(root.controller.results()).toEqual([tokyo])

  root.controller.onQueryChange('London')

  expect(root.controller.results()).toEqual([])
  expect(root.controller.status()).toBe('searching')
  root.dispose()
})

it('should cancel a superseded request and ignore its late result', async () => {
  const first = Promise.withResolvers<ReadonlyArray<typeof tokyo>>()
  clientMocks.searchWeatherLocations
    .mockReturnValueOnce(first.promise)
    .mockResolvedValueOnce([tokyo])
  const root = createSearchRoot()

  root.controller.onQueryChange('Seoul')
  await vi.advanceTimersByTimeAsync(300)
  const firstSignal = clientMocks.searchWeatherLocations.mock.calls[0]?.[0].signal
  root.controller.onQueryChange('Tokyo')
  expect(firstSignal?.aborted).toBe(true)
  await vi.advanceTimersByTimeAsync(300)
  first.resolve([])
  await Promise.resolve()

  expect(root.controller.results()).toEqual([tokyo])
  root.controller.onSelect(tokyo)
  expect(root.controller.results()).toEqual([])
  expect(root.controller.status()).toBe('idle')
  root.dispose()
})

it('should ignore a rejected request after aborting it', async () => {
  const request = Promise.withResolvers<ReadonlyArray<typeof tokyo>>()
  clientMocks.searchWeatherLocations.mockReturnValueOnce(request.promise)
  const root = createSearchRoot()

  root.controller.onQueryChange('Tokyo')
  await vi.advanceTimersByTimeAsync(300)
  root.controller.onSelect(tokyo)
  request.reject(new Error('aborted'))
  await Promise.resolve()

  expect(root.controller.status()).toBe('idle')
  root.dispose()
})

it('should expose provider failures and abort work when disposed', async () => {
  clientMocks.searchWeatherLocations.mockRejectedValueOnce(new Error('unavailable'))
  const root = createSearchRoot()

  root.controller.onQueryChange('Tokyo')
  await vi.advanceTimersByTimeAsync(300)
  expect(root.controller.status()).toBe('error')

  clientMocks.searchWeatherLocations.mockReturnValueOnce(
    new Promise(() => {
      // The request intentionally stays pending until disposal aborts it.
    }),
  )
  root.controller.onQueryChange('Seoul')
  await vi.advanceTimersByTimeAsync(300)
  const signal = clientMocks.searchWeatherLocations.mock.calls.at(-1)?.[0].signal
  root.dispose()
  expect(signal?.aborted).toBe(true)
})
