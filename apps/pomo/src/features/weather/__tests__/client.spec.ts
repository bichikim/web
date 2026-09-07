/** @vitest-environment jsdom */

import {afterEach, expect, it, vi} from 'vitest'

import type {WeatherFeed} from '../contract'
import {fetchWeatherFeed} from '../client'
import {LEGACY_WEATHER_LOCATIONS} from '../locations'

const feed = {
  current: {
    condition: 'clear',
    humidityPercent: 50,
    precipitationMillimeters: 0,
    temperatureCelsius: 24,
  },
  expiresAt: '2026-08-23T03:05:00.000Z',
  location: LEGACY_WEATHER_LOCATIONS.seoul,
  observedAt: '2026-08-23T02:50:00.000Z',
  schemaVersion: 2,
  source: {
    name: 'OpenWeather',
    url: 'https://openweathermap.org/',
  },
  stale: false,
  updatedAt: '2026-08-23T03:00:00.000Z',
} satisfies WeatherFeed

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const resolveWeatherResultAfterRetry = async (request: ReturnType<typeof fetchWeatherFeed>) => {
  await vi.advanceTimersToNextTimerAsync()
  return request
}

it('should return a validated available feed', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(feed)))

  await expect(fetchWeatherFeed(LEGACY_WEATHER_LOCATIONS.seoul.id)).resolves.toEqual({
    feed,
    status: 'available',
  })
})

it('should reject a feed for a different city than requested', () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(feed)))

  return expect(fetchWeatherFeed(LEGACY_WEATHER_LOCATIONS.busan.id)).rejects.toMatchObject({
    kind: 'schema',
  })
})

it('should expose the server collection retry delay', async () => {
  vi.useFakeTimers()
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        Response.json({code: 'weather_collecting'}, {headers: {'Retry-After': '2'}, status: 503}),
      ),
  )

  await expect(
    resolveWeatherResultAfterRetry(fetchWeatherFeed(LEGACY_WEATHER_LOCATIONS.seoul.id)),
  ).resolves.toEqual({retryAfterMilliseconds: 2_000, status: 'collecting'})
})

it('should distinguish a provider failure from an active collection', async () => {
  vi.useFakeTimers()
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        Response.json({code: 'weather_unavailable'}, {headers: {'Retry-After': '30'}, status: 503}),
      ),
  )

  await expect(
    resolveWeatherResultAfterRetry(fetchWeatherFeed(LEGACY_WEATHER_LOCATIONS.seoul.id)),
  ).resolves.toEqual({retryAfterMilliseconds: 30_000, status: 'unavailable'})
})

it.each([undefined, '0', '1.5'])('should ignore the invalid retry delay %s', async (retryAfter) => {
  vi.useFakeTimers()
  const headers = retryAfter === undefined ? undefined : {'Retry-After': retryAfter}
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(Response.json({code: 'weather_unavailable'}, {headers, status: 503})),
  )

  await expect(
    resolveWeatherResultAfterRetry(fetchWeatherFeed(LEGACY_WEATHER_LOCATIONS.seoul.id)),
  ).resolves.toEqual({retryAfterMilliseconds: null, status: 'unavailable'})
})

it('should reject an unsuccessful weather response', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, {status: 404})))

  await expect(fetchWeatherFeed(LEGACY_WEATHER_LOCATIONS.seoul.id)).rejects.toThrow(
    'Weather feed request failed with status 404',
  )
})

it('should distinguish an invalid JSON weather response', () => {
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response('{')))

  return expect(fetchWeatherFeed(LEGACY_WEATHER_LOCATIONS.seoul.id)).rejects.toMatchObject({
    kind: 'parse',
  })
})

it('should distinguish a weather response schema mismatch', () => {
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>().mockResolvedValue(Response.json({...feed, stale: 1})),
  )

  return expect(fetchWeatherFeed(LEGACY_WEATHER_LOCATIONS.seoul.id)).rejects.toMatchObject({
    kind: 'schema',
  })
})
