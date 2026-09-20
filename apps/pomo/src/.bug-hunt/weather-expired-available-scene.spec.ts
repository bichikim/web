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

vi.mock('../features/weather/preference', async () => {
  const actual: typeof import('../features/weather/preference') = await vi.importActual(
    '../features/weather/preference',
  )
  return {
    ...actual,
    DEFAULT_WEATHER_PREFERENCE: preferenceMocks.defaultPreference,
    readWeatherPreference: preferenceMocks.readWeatherPreference,
    writeWeatherPreference: preferenceMocks.writeWeatherPreference,
  }
})
vi.mock('../features/weather/query', () => queryMocks)

import {useWeather} from '../features/weather/use-weather'

const NOW = new Date('2026-08-23T03:00:00.000Z')
const seoulLocation = preferenceMocks.seoulLocation
const feed = {
  current: {
    condition: 'clear',
    humidityPercent: 50,
    precipitationMillimeters: 0,
    temperatureCelsius: 24,
  },
  expiresAt: '2026-08-23T03:05:00.000Z',
  location: seoulLocation,
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
  preferenceMocks.readWeatherPreference.mockReset()
  preferenceMocks.writeWeatherPreference.mockReset()
  queryMocks.weatherFeedQuery.mockReset()
  queryMocks.weatherFeedQuery.keyFor.mockReset()
  queryMocks.weatherFeedQuery.keyFor.mockImplementation(
    (locationId) => `weather-feed:${locationId}`,
  )
  preferenceMocks.readWeatherPreference.mockResolvedValue({
    enabled: true,
    location: seoulLocation,
    sceneMode: 'auto',
  })
  preferenceMocks.writeWeatherPreference.mockResolvedValue(undefined)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.useRealTimers()
})

it('should hide an automatic scene when revalidation returns an expired available feed', async () => {
  queryMocks.weatherFeedQuery
    .mockResolvedValueOnce({
      feed,
      locationId: seoulLocation.id,
      status: 'available',
    })
    .mockResolvedValueOnce({
      feed,
      locationId: seoulLocation.id,
      status: 'available',
    })
  const view = renderHook(() => useWeather(), {wrapper: PreferenceProvider})
  await flushPromises()

  expect(view.result.sceneCondition()).toBe('clear')

  vi.setSystemTime(new Date('2026-08-23T03:06:00.000Z'))
  view.result.onLocationChange(seoulLocation)
  await flushPromises()

  expect(view.result.sceneCondition()).toBeUndefined()
  view.cleanup()
})
