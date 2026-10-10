/** @vitest-environment jsdom */

import {cleanup, renderHook} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {PreferenceProvider} from 'src/hooks/use-preference'

const preferenceMocks = vi.hoisted(() => {
  const seoulLocation = {
    country: '대한민국',
    id: 'openweather:legacy:seoul' as const,
    legacyCitySlug: 'seoul' as const,
    name: '서울',
    region: '서울특별시',
  }
  return {
    defaultPreference: {enabled: true, location: seoulLocation, sceneMode: 'auto' as const},
    readWeatherPreference: vi.fn(),
    seoulLocation,
    writeWeatherPreference: vi.fn(),
  }
})
const queryMocks = vi.hoisted(() => ({
  weatherFeedQuery: Object.assign(vi.fn(), {
    key: 'weather-feed',
    keyFor: vi.fn(),
  }),
}))

vi.mock('src/features/weather/preference', async () => {
  const actual = await vi.importActual<typeof import('src/features/weather/preference')>(
    'src/features/weather/preference',
  )
  return {
    ...actual,
    DEFAULT_WEATHER_PREFERENCE: preferenceMocks.defaultPreference,
    readWeatherPreference: preferenceMocks.readWeatherPreference,
    writeWeatherPreference: preferenceMocks.writeWeatherPreference,
  }
})
vi.mock('src/features/weather/query', () => queryMocks)
vi.mock('@solidjs/router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@solidjs/router')>()
  return {
    ...actual,
    revalidate: vi.fn(async () => undefined),
  }
})

import {useWeather} from 'src/features/weather/use-weather'

const NOW = new Date('2026-08-23T03:00:00.000Z')
const feed = {
  current: {
    condition: 'clear',
    humidityPercent: 50,
    precipitationMillimeters: 0,
    temperatureCelsius: 24,
  },
  expiresAt: '2026-08-23T03:05:00.000Z',
  location: preferenceMocks.seoulLocation,
  observedAt: '2026-08-23T02:50:00.000Z',
  schemaVersion: 2,
  source: {name: 'OpenWeather', url: 'https://openweathermap.org/'},
  stale: false,
  updatedAt: '2026-08-23T03:00:00.000Z',
} as const

const flushPromises = async () => {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  preferenceMocks.readWeatherPreference.mockResolvedValue({
    enabled: true,
    location: preferenceMocks.seoulLocation,
    sceneMode: 'auto',
  })
  preferenceMocks.writeWeatherPreference.mockResolvedValue(undefined)
  queryMocks.weatherFeedQuery.mockReset()
  queryMocks.weatherFeedQuery.keyFor.mockImplementation(
    (locationId: string) => `weather-feed:${locationId}`,
  )
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.useRealTimers()
})

it('should mark an available feed stale after expiresAt even before revalidation finishes', async () => {
  queryMocks.weatherFeedQuery
    .mockResolvedValueOnce({
      feed,
      locationId: preferenceMocks.seoulLocation.id,
      status: 'available',
    })
    .mockImplementation(() => new Promise(() => undefined))

  const view = renderHook(() => useWeather(), {wrapper: PreferenceProvider})
  await flushPromises()

  expect(view.result.sceneCondition()).toBe('clear')
  expect(view.result.state()).toEqual({feed, status: 'ready'})

  vi.setSystemTime(new Date('2026-08-23T03:06:00.000Z'))
  await vi.advanceTimersByTimeAsync(301_000)
  await flushPromises()

  expect(view.result.state()).toEqual({feed: {...feed, stale: true}, status: 'ready'})
  expect(view.result.isReady()).toBe(false)
  expect(view.result.sceneCondition()).toBeUndefined()
  view.cleanup()
})
