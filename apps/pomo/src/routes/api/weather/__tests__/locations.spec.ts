import type {APIEvent} from '@solidjs/start/server'
import {beforeEach, expect, it, vi} from 'vitest'

const weatherLocationMocks = vi.hoisted(() => ({searchWorldWeatherLocations: vi.fn()}))

vi.mock('src/server/weather/world-locations', () => ({
  searchWorldWeatherLocations: weatherLocationMocks.searchWorldWeatherLocations,
}))

import {GET} from '../locations'

const createEvent = (query: string): APIEvent =>
  ({request: new Request(`https://www.pomofi.io/api/weather/locations?${query}`)}) as APIEvent

beforeEach(() => {
  vi.clearAllMocks()
})

it.each(['', 'q=', 'q=a', `q=${'a'.repeat(81)}`])(
  'should reject the invalid location query %s',
  async (query) => {
    const response = await GET(createEvent(query))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({code: 'weather_location_query_invalid'})
    expect(weatherLocationMocks.searchWorldWeatherLocations).not.toHaveBeenCalled()
  },
)

it('should return cached registered locations for a trimmed query', async () => {
  const locations = [
    {
      country: 'Japan',
      id: 'openweather:35.6900,139.6900',
      name: 'Tokyo',
      region: 'Tokyo',
    },
  ]
  weatherLocationMocks.searchWorldWeatherLocations.mockResolvedValue(locations)

  const response = await GET(createEvent('q=%20Tokyo%20'))

  expect(response.status).toBe(200)
  expect(response.headers.get('Cache-Control')).toBe('public, max-age=60, s-maxage=86400')
  await expect(response.json()).resolves.toEqual(locations)
  expect(weatherLocationMocks.searchWorldWeatherLocations).toHaveBeenCalledExactlyOnceWith({
    query: 'Tokyo',
  })
})

it('should hide provider failures behind a retryable service response', async () => {
  weatherLocationMocks.searchWorldWeatherLocations.mockRejectedValue(new Error('secret'))

  const response = await GET(createEvent('q=Tokyo'))

  expect(response.status).toBe(503)
  expect(response.headers.get('Retry-After')).toBe('60')
  await expect(response.json()).resolves.toEqual({code: 'weather_location_search_unavailable'})
})
