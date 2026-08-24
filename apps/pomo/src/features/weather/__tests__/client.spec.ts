/** @vitest-environment jsdom */

import {afterEach, expect, it, vi} from 'vitest'

import type {WeatherFeed} from '../contract'
import {fetchWeatherFeed} from '../client'

const feed = {
  city: {label: '서울', slug: 'seoul'},
  current: {
    condition: 'clear',
    humidityPercent: 50,
    precipitationMillimeters: 0,
    temperatureCelsius: 24,
  },
  expiresAt: '2026-08-23T03:05:00.000Z',
  observedAt: '2026-08-23T02:50:00.000Z',
  schemaVersion: 1,
  source: {
    name: '기상청',
    url: 'https://www.data.go.kr/data/15084084/openapi.do',
  },
  stale: false,
  updatedAt: '2026-08-23T03:00:00.000Z',
} satisfies WeatherFeed

afterEach(() => {
  vi.unstubAllGlobals()
})

it('should return a validated available feed', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(feed)))

  await expect(fetchWeatherFeed('seoul')).resolves.toEqual({feed, status: 'available'})
})

it('should expose the server collection retry delay', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        Response.json({code: 'weather_collecting'}, {headers: {'Retry-After': '2'}, status: 503}),
      ),
  )

  await expect(fetchWeatherFeed('seoul')).resolves.toEqual({
    retryAfterMilliseconds: 2_000,
    status: 'collecting',
  })
})

it('should distinguish a provider failure from an active collection', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        Response.json({code: 'weather_unavailable'}, {headers: {'Retry-After': '30'}, status: 503}),
      ),
  )

  await expect(fetchWeatherFeed('seoul')).resolves.toEqual({
    retryAfterMilliseconds: 30_000,
    status: 'unavailable',
  })
})

it('should distinguish an invalid JSON weather response', () => {
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response('{')))

  return expect(fetchWeatherFeed('seoul')).rejects.toMatchObject({kind: 'parse'})
})

it('should distinguish a weather response schema mismatch', () => {
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>().mockResolvedValue(Response.json({...feed, stale: 1})),
  )

  return expect(fetchWeatherFeed('seoul')).rejects.toMatchObject({kind: 'schema'})
})
