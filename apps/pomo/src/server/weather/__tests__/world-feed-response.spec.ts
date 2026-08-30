import {afterEach, beforeEach, expect, it, vi} from 'vitest'

const locationMocks = vi.hoisted(() => ({getWorldWeatherLocation: vi.fn()}))
const weatherMocks = vi.hoisted(() => ({
  getWorldWeatherFeedState: vi.fn(),
  ingestWorldWeather: vi.fn(),
}))

vi.mock('../world-locations', () => ({
  getWorldWeatherLocation: locationMocks.getWorldWeatherLocation,
}))
vi.mock('../world-weather', () => weatherMocks)

import {createWorldWeatherFeedResponse} from '../world-feed-response'

const NOW = new Date('2026-08-29T03:00:00.000Z')
const location = {
  country: 'Japan',
  id: 'openweather:35.6900,139.6900',
  latitude: 35.69,
  longitude: 139.69,
  name: 'Tokyo',
  providerLocationId: '123',
  region: 'Tokyo',
} as const
const feed = {
  current: {
    condition: 'clear',
    humidityPercent: 50,
    precipitationMillimeters: 0,
    temperatureCelsius: 25,
  },
  expiresAt: '2026-08-29T03:30:00.000Z',
  location: {
    country: 'Japan',
    id: 'openweather:35.6900,139.6900',
    name: 'Tokyo',
    region: 'Tokyo',
  },
  observedAt: '2026-08-29T02:45:00.000Z',
  schemaVersion: 2,
  source: {name: 'OpenWeather', url: 'https://openweathermap.org/'},
  stale: false,
  updatedAt: '2026-08-29T03:00:00.000Z',
} as const

beforeEach(() => {
  vi.clearAllMocks()
  locationMocks.getWorldWeatherLocation.mockResolvedValue(location)
})

afterEach(() => {
  vi.restoreAllMocks()
})

it.each(['tokyo', 'openweather:tokyo'])('should reject invalid location id %s', async (id) => {
  const response = await createWorldWeatherFeedResponse(id, NOW)

  expect(response.status).toBe(404)
  expect(locationMocks.getWorldWeatherLocation).not.toHaveBeenCalled()
})

it('should reject an unregistered provider location', async () => {
  locationMocks.getWorldWeatherLocation.mockResolvedValue(undefined)

  const response = await createWorldWeatherFeedResponse('openweather:35.6900,139.6900', NOW)

  expect(response.status).toBe(404)
})

it('should return a current feed with its remaining public cache lifetime', async () => {
  weatherMocks.getWorldWeatherFeedState.mockResolvedValue({feed, status: 'current'})

  const response = await createWorldWeatherFeedResponse('openweather:35.6900,139.6900', NOW)

  expect(response.status).toBe(200)
  expect(response.headers.get('Cache-Control')).toBe('public, max-age=1800, s-maxage=1800')
  await expect(response.json()).resolves.toEqual(feed)
  expect(weatherMocks.ingestWorldWeather).not.toHaveBeenCalled()
})

it('should collect a missing feed and return the refreshed value', async () => {
  weatherMocks.getWorldWeatherFeedState
    .mockResolvedValueOnce({status: 'missing'})
    .mockResolvedValueOnce({feed, status: 'current'})
  weatherMocks.ingestWorldWeather.mockResolvedValue({status: 'completed'})

  const response = await createWorldWeatherFeedResponse('openweather:35.6900,139.6900', NOW)

  expect(response.status).toBe(200)
  await expect(response.json()).resolves.toEqual(feed)
})

it('should expose a collection retry delay before the first feed exists', async () => {
  weatherMocks.getWorldWeatherFeedState.mockResolvedValue({status: 'missing'})
  weatherMocks.ingestWorldWeather.mockResolvedValue({
    retryAfter: new Date(NOW.getTime() + 2_000),
    status: 'collecting',
  })

  const response = await createWorldWeatherFeedResponse('openweather:35.6900,139.6900', NOW)

  expect(response.status).toBe(503)
  expect(response.headers.get('Retry-After')).toBe('2')
  await expect(response.json()).resolves.toEqual({code: 'weather_collecting'})
})

it('should use the default retry when a completed collection still has no readable feed', async () => {
  weatherMocks.getWorldWeatherFeedState.mockResolvedValue({status: 'missing'})
  weatherMocks.ingestWorldWeather.mockResolvedValue({status: 'completed'})

  const response = await createWorldWeatherFeedResponse('openweather:35.6900,139.6900', NOW)

  expect(response.status).toBe(503)
  expect(response.headers.get('Retry-After')).toBe('60')
  await expect(response.json()).resolves.toEqual({code: 'weather_unavailable'})
})

it('should log a provider failure and retain its retry date', async () => {
  const error = new Error('provider unavailable')
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  weatherMocks.getWorldWeatherFeedState.mockResolvedValue({status: 'missing'})
  weatherMocks.ingestWorldWeather.mockResolvedValue({
    error,
    retryAfter: new Date(NOW.getTime() + 30_000),
    status: 'failed',
  })

  const response = await createWorldWeatherFeedResponse('openweather:35.6900,139.6900', NOW)

  expect(response.status).toBe(503)
  expect(response.headers.get('Retry-After')).toBe('30')
  expect(consoleError).toHaveBeenCalledWith(
    'Failed to collect world weather for openweather:35.6900,139.6900.',
    error,
  )
})

it('should preserve an outdated feed after an unexpected refresh error', async () => {
  const error = new Error('database unavailable')
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  weatherMocks.getWorldWeatherFeedState.mockResolvedValueOnce({feed, status: 'outdated'})
  weatherMocks.ingestWorldWeather.mockRejectedValue(error)

  const response = await createWorldWeatherFeedResponse('openweather:35.6900,139.6900', NOW)

  expect(response.status).toBe(200)
  expect(response.headers.get('Cache-Control')).toBe('public, max-age=60, s-maxage=60')
  expect(consoleError).toHaveBeenCalledWith(
    'Failed to refresh world weather for openweather:35.6900,139.6900.',
    error,
  )
})

it('should preserve an outdated feed during a provider cooldown', async () => {
  weatherMocks.getWorldWeatherFeedState.mockResolvedValue({
    feed: {...feed, stale: true},
    status: 'outdated',
  })
  weatherMocks.ingestWorldWeather.mockResolvedValue({
    retryAfter: new Date(NOW.getTime() + 60_000),
    status: 'cooldown',
  })

  const response = await createWorldWeatherFeedResponse('openweather:35.6900,139.6900', NOW)
  const body = await response.json()

  expect(response.status).toBe(200)
  expect(response.headers.get('Cache-Control')).toBe('public, max-age=60, s-maxage=60')
  expect(body).toMatchObject({stale: true})
})
