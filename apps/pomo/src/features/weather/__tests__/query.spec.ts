import {query} from '@solidjs/router'
import {afterEach, expect, it, vi} from 'vitest'

const clientMocks = vi.hoisted(() => ({fetchWeatherFeed: vi.fn()}))

vi.mock('../client', () => ({fetchWeatherFeed: clientMocks.fetchWeatherFeed}))

import {LEGACY_WEATHER_LOCATIONS} from '../locations'
import {weatherFeedQuery} from '../query'

const locationId = LEGACY_WEATHER_LOCATIONS.seoul.id

afterEach(() => {
  query.clear()
  vi.clearAllMocks()
})

it('should forward the location to the existing adapter and identify the query result', async () => {
  clientMocks.fetchWeatherFeed.mockResolvedValueOnce({
    retryAfterMilliseconds: 2_000,
    status: 'collecting',
  })

  await expect(weatherFeedQuery(locationId)).resolves.toEqual({
    locationId,
    retryAfterMilliseconds: 2_000,
    status: 'collecting',
  })
  expect(clientMocks.fetchWeatherFeed).toHaveBeenCalledOnce()
  expect(clientMocks.fetchWeatherFeed).toHaveBeenCalledWith(locationId)
})

it('should deduplicate simultaneous requests for the same location', async () => {
  const request = Promise.withResolvers<{
    readonly retryAfterMilliseconds: null
    readonly status: 'unavailable'
  }>()
  clientMocks.fetchWeatherFeed.mockReturnValueOnce(request.promise)

  const firstResult = weatherFeedQuery(locationId)
  const secondResult = weatherFeedQuery(locationId)
  request.resolve({retryAfterMilliseconds: null, status: 'unavailable'})

  await expect(firstResult).resolves.toEqual({
    locationId,
    retryAfterMilliseconds: null,
    status: 'unavailable',
  })
  await expect(secondResult).resolves.toEqual({
    locationId,
    retryAfterMilliseconds: null,
    status: 'unavailable',
  })
  expect(clientMocks.fetchWeatherFeed).toHaveBeenCalledOnce()
})

it('should normalize adapter failures into a retryable query result', async () => {
  clientMocks.fetchWeatherFeed.mockRejectedValueOnce(new Error('network unavailable'))

  await expect(weatherFeedQuery(locationId)).resolves.toEqual({locationId, status: 'failed'})
})
