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

const flushPromises = async () => {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
  preferenceMocks.readWeatherPreference.mockReset()
  preferenceMocks.writeWeatherPreference.mockReset()
  queryMocks.weatherFeedQuery.mockReset()
  queryMocks.weatherFeedQuery.keyFor.mockImplementation(
    (locationId) => `weather-feed:${locationId}`,
  )
  preferenceMocks.readWeatherPreference.mockResolvedValue({
    enabled: true,
    location: preferenceMocks.seoulLocation,
    sceneMode: 'auto',
  })
  preferenceMocks.writeWeatherPreference.mockResolvedValue(undefined)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.useRealTimers()
})

it('should not drive an automatic sunny scene when the initial weather feed fetch fails', async () => {
  queryMocks.weatherFeedQuery.mockResolvedValueOnce({
    locationId: preferenceMocks.seoulLocation.id,
    status: 'failed',
  })

  const view = renderHook(() => useWeather(), {wrapper: PreferenceProvider})
  await flushPromises()

  expect(view.result.state()).toEqual({
    location: preferenceMocks.seoulLocation,
    status: 'error',
  })
  expect(view.result.sceneCondition()).toBeUndefined()
  view.cleanup()
})
