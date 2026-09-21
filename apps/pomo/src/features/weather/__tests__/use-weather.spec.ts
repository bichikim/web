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

vi.mock('../preference', async () => {
  const actual: typeof import('../preference') = await vi.importActual('../preference')
  return {
    ...actual,
    DEFAULT_WEATHER_PREFERENCE: preferenceMocks.defaultPreference,
    readWeatherPreference: preferenceMocks.readWeatherPreference,
    writeWeatherPreference: preferenceMocks.writeWeatherPreference,
  }
})
vi.mock('../query', () => queryMocks)

import {type WeatherController, useWeather} from '../use-weather'
import type {WeatherPreference} from '../preference'

const NOW = new Date('2026-08-23T03:00:00.000Z')
const seoulLocation = preferenceMocks.seoulLocation
const busanLocation = {
  country: '대한민국',
  id: 'openweather:legacy:busan',
  legacyCitySlug: 'busan',
  name: '부산',
  region: '부산광역시',
} as const
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
const availableResult = {
  feed,
  locationId: seoulLocation.id,
  status: 'available',
} as const

const createWeatherRoot = (): {
  readonly controller: WeatherController
  readonly dispose: () => void
} => {
  const view = renderHook(() => useWeather(), {wrapper: PreferenceProvider})
  return {controller: view.result, dispose: view.cleanup}
}

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

it('should load the stored preference and expose the query result', async () => {
  queryMocks.weatherFeedQuery.mockResolvedValueOnce(availableResult)
  const root = createWeatherRoot()

  await flushPromises()

  expect(queryMocks.weatherFeedQuery).toHaveBeenCalledOnce()
  expect(queryMocks.weatherFeedQuery).toHaveBeenCalledWith(seoulLocation.id)
  expect(root.controller.state()).toEqual({feed, status: 'ready'})
  expect(root.controller.sceneCondition()).toBe('clear')
  root.dispose()
})

it('should wait for an automatic feed before exposing scene readiness', async () => {
  const rainyFeed = {...feed, current: {...feed.current, condition: 'rain' as const}}
  const rainyResult = {feed: rainyFeed, locationId: seoulLocation.id, status: 'available'} as const
  const weatherRequest = Promise.withResolvers<typeof rainyResult>()
  queryMocks.weatherFeedQuery.mockReturnValueOnce(weatherRequest.promise)
  const root = createWeatherRoot()

  await flushPromises()

  expect(root.controller.isReady()).toBe(false)
  expect(root.controller.sceneCondition()).toBeUndefined()

  weatherRequest.resolve(rainyResult)
  await flushPromises()

  expect(root.controller.isReady()).toBe(true)
  expect(root.controller.sceneCondition()).toBe('rain')
  root.dispose()
})

it('should hide weather and scene until the stored preference is restored', async () => {
  const stored = Promise.withResolvers<WeatherPreference>()
  preferenceMocks.readWeatherPreference.mockReturnValueOnce(stored.promise)
  const root = createWeatherRoot()

  expect(root.controller.isReady()).toBe(false)
  expect(root.controller.enabled()).toBe(false)
  expect(root.controller.state()).toEqual({status: 'disabled'})
  expect(queryMocks.weatherFeedQuery).not.toHaveBeenCalled()

  stored.resolve({
    enabled: false,
    location: seoulLocation,
    sceneMode: 'rain',
  })
  await flushPromises()

  expect(root.controller.isReady()).toBe(true)
  expect(root.controller.enabled()).toBe(false)
  expect(root.controller.state()).toEqual({status: 'disabled'})
  expect(root.controller.sceneCondition()).toBe('rain')
  root.dispose()
})

it('should hide weather status but keep querying for an automatic scene', async () => {
  const overcastFeed = {...feed, current: {...feed.current, condition: 'overcast' as const}}
  preferenceMocks.readWeatherPreference.mockResolvedValueOnce({
    enabled: false,
    location: seoulLocation,
    sceneMode: 'auto',
  })
  queryMocks.weatherFeedQuery.mockResolvedValueOnce({
    feed: overcastFeed,
    locationId: seoulLocation.id,
    status: 'available',
  })
  const root = createWeatherRoot()

  await flushPromises()

  expect(root.controller.enabled()).toBe(false)
  expect(root.controller.state()).toEqual({status: 'disabled'})
  expect(root.controller.sceneCondition()).toBe('overcast')
  expect(queryMocks.weatherFeedQuery).toHaveBeenCalledWith(seoulLocation.id)
  root.dispose()
})

it('should start and stop the query when hidden weather changes between manual and automatic', async () => {
  preferenceMocks.readWeatherPreference.mockResolvedValueOnce({
    enabled: false,
    location: seoulLocation,
    sceneMode: 'cloudy',
  })
  queryMocks.weatherFeedQuery.mockResolvedValue(availableResult)
  const root = createWeatherRoot()
  await flushPromises()

  expect(queryMocks.weatherFeedQuery).not.toHaveBeenCalled()
  expect(root.controller.sceneCondition()).toBe('cloudy')

  root.controller.onSceneModeChange('auto')
  await flushPromises()
  expect(queryMocks.weatherFeedQuery).toHaveBeenCalledOnce()
  expect(root.controller.sceneCondition()).toBe('clear')

  root.controller.onSceneModeChange('snow')
  await flushPromises()
  expect(root.controller.sceneCondition()).toBe('snow')
  expect(root.controller.state()).toEqual({status: 'disabled'})
  root.dispose()
})

it('should persist a location change, show loading, and ignore the superseded result', async () => {
  const seoulRequest = Promise.withResolvers<typeof availableResult>()
  const busanFeed = {...feed, location: busanLocation} as const
  queryMocks.weatherFeedQuery.mockReturnValueOnce(seoulRequest.promise).mockResolvedValueOnce({
    feed: busanFeed,
    locationId: busanLocation.id,
    status: 'available',
  })
  const root = createWeatherRoot()
  await flushPromises()

  root.controller.onLocationChange(busanLocation)
  expect(root.controller.location()).toEqual(busanLocation)
  expect(root.controller.state()).toEqual({location: busanLocation, status: 'loading'})
  expect(root.controller.isReady()).toBe(false)
  await flushPromises()

  expect(root.controller.state()).toEqual({feed: busanFeed, status: 'ready'})
  expect(root.controller.isReady()).toBe(true)
  expect(preferenceMocks.writeWeatherPreference).toHaveBeenCalledWith({
    enabled: true,
    location: busanLocation,
    sceneMode: 'auto',
  })

  seoulRequest.resolve(availableResult)
  await flushPromises()
  expect(root.controller.state()).toEqual({feed: busanFeed, status: 'ready'})
  root.dispose()
})

it('should withhold an automatic scene after a location change fetch failure', async () => {
  const rainyFeed = {...feed, current: {...feed.current, condition: 'rain' as const}}
  const rainyResult = {feed: rainyFeed, locationId: seoulLocation.id, status: 'available'} as const
  queryMocks.weatherFeedQuery
    .mockResolvedValueOnce(rainyResult)
    .mockResolvedValueOnce({locationId: busanLocation.id, status: 'failed'})
  const root = createWeatherRoot()

  await flushPromises()

  expect(root.controller.state()).toEqual({feed: rainyFeed, status: 'ready'})
  expect(root.controller.sceneCondition()).toBe('rain')

  root.controller.onLocationChange(busanLocation)
  await flushPromises()

  expect(root.controller.state()).toEqual({location: busanLocation, status: 'error'})
  expect(root.controller.isReady()).toBe(false)
  expect(root.controller.sceneCondition()).toBeUndefined()
  root.dispose()
})

it('should keep the previous feed while the current location collects', async () => {
  queryMocks.weatherFeedQuery.mockResolvedValueOnce(availableResult).mockResolvedValueOnce({
    locationId: seoulLocation.id,
    retryAfterMilliseconds: 2_000,
    status: 'collecting',
  })
  const root = createWeatherRoot()
  await flushPromises()

  root.controller.onLocationChange(seoulLocation)
  await flushPromises()

  expect(root.controller.state()).toEqual({feed, status: 'ready'})
  root.dispose()
})

it('should hide an automatic scene when revalidation returns an expired available feed', async () => {
  queryMocks.weatherFeedQuery.mockResolvedValueOnce(availableResult).mockResolvedValueOnce({
    feed,
    locationId: seoulLocation.id,
    status: 'available',
  })
  const root = createWeatherRoot()
  await flushPromises()

  expect(root.controller.sceneCondition()).toBe('clear')

  vi.setSystemTime(new Date('2026-08-23T03:06:00.000Z'))
  root.controller.onLocationChange(seoulLocation)
  await flushPromises()

  expect(root.controller.state()).toEqual({feed: {...feed, stale: true}, status: 'ready'})
  expect(root.controller.isReady()).toBe(false)
  expect(root.controller.sceneCondition()).toBeUndefined()
  root.dispose()
})

it('should hide an automatic scene when revalidation retains an expired feed', async () => {
  queryMocks.weatherFeedQuery
    .mockResolvedValueOnce(availableResult)
    .mockResolvedValueOnce({
      locationId: seoulLocation.id,
      retryAfterMilliseconds: null,
      status: 'unavailable',
    })
    .mockResolvedValueOnce({locationId: seoulLocation.id, status: 'failed'})
  const root = createWeatherRoot()
  await flushPromises()

  vi.setSystemTime(new Date('2026-08-23T03:06:00.000Z'))
  root.controller.onLocationChange(seoulLocation)
  await flushPromises()
  expect(root.controller.state()).toEqual({feed: {...feed, stale: true}, status: 'ready'})
  expect(root.controller.isReady()).toBe(false)
  expect(root.controller.sceneCondition()).toBeUndefined()

  root.controller.onLocationChange(seoulLocation)
  await flushPromises()
  expect(root.controller.state()).toEqual({feed: {...feed, stale: true}, status: 'ready'})
  expect(root.controller.isReady()).toBe(false)
  expect(root.controller.sceneCondition()).toBeUndefined()
  root.dispose()
})

it('should distinguish collecting from unavailable and failed initial results', async () => {
  queryMocks.weatherFeedQuery.mockResolvedValueOnce({
    locationId: seoulLocation.id,
    retryAfterMilliseconds: 2_000,
    status: 'collecting',
  })
  const collectingRoot = createWeatherRoot()
  await flushPromises()
  expect(collectingRoot.controller.state()).toEqual({location: seoulLocation, status: 'loading'})
  collectingRoot.dispose()

  queryMocks.weatherFeedQuery.mockResolvedValueOnce({
    locationId: seoulLocation.id,
    retryAfterMilliseconds: null,
    status: 'unavailable',
  })
  const unavailableRoot = createWeatherRoot()
  await flushPromises()
  expect(unavailableRoot.controller.state()).toEqual({location: seoulLocation, status: 'error'})
  unavailableRoot.dispose()

  queryMocks.weatherFeedQuery.mockResolvedValueOnce({
    locationId: seoulLocation.id,
    status: 'failed',
  })
  const failedRoot = createWeatherRoot()
  await flushPromises()
  expect(failedRoot.controller.state()).toEqual({location: seoulLocation, status: 'error'})
  failedRoot.dispose()
})

it.each([
  {locationId: seoulLocation.id, status: 'failed'},
  {locationId: seoulLocation.id, retryAfterMilliseconds: null, status: 'unavailable'},
] as const)('should withhold an automatic scene after an initial weather error', async (result) => {
  queryMocks.weatherFeedQuery.mockResolvedValueOnce(result)
  const root = createWeatherRoot()

  await flushPromises()

  expect(root.controller.isReady()).toBe(false)
  expect(root.controller.sceneCondition()).toBeUndefined()
  root.dispose()
})

it('should use the default preference when stored preference loading fails', async () => {
  preferenceMocks.readWeatherPreference.mockRejectedValueOnce(new Error('storage unavailable'))
  queryMocks.weatherFeedQuery.mockResolvedValueOnce(availableResult)
  const root = createWeatherRoot()

  await flushPromises()

  expect(queryMocks.weatherFeedQuery).toHaveBeenCalledWith(seoulLocation.id)
  expect(root.controller.state()).toEqual({feed, status: 'ready'})
  root.dispose()
})

it('should retain in-memory changes when preference persistence fails', async () => {
  preferenceMocks.writeWeatherPreference.mockRejectedValueOnce(new Error('storage unavailable'))
  queryMocks.weatherFeedQuery.mockResolvedValue(availableResult)
  const root = createWeatherRoot()
  await flushPromises()

  root.controller.onEnabledChange(false)
  await flushPromises()

  expect(root.controller.enabled()).toBe(false)
  expect(root.controller.state()).toEqual({status: 'disabled'})
  root.dispose()
})

it('should ignore stored preferences and query results after disposal', async () => {
  const storedPreference = Promise.withResolvers<{
    enabled: boolean
    location: typeof busanLocation
    sceneMode: 'auto'
  }>()
  preferenceMocks.readWeatherPreference.mockReturnValueOnce(storedPreference.promise)
  const storedRoot = createWeatherRoot()
  storedRoot.dispose()
  storedPreference.resolve({enabled: true, location: busanLocation, sceneMode: 'auto'})
  await flushPromises()
  expect(storedRoot.controller.location()).toEqual(seoulLocation)
  expect(queryMocks.weatherFeedQuery).not.toHaveBeenCalled()

  preferenceMocks.readWeatherPreference.mockResolvedValueOnce({
    enabled: true,
    location: seoulLocation,
    sceneMode: 'auto',
  })
  const weatherRequest = Promise.withResolvers<typeof availableResult>()
  queryMocks.weatherFeedQuery.mockReturnValueOnce(weatherRequest.promise)
  const queryRoot = createWeatherRoot()
  await flushPromises()
  queryRoot.dispose()
  weatherRequest.resolve(availableResult)
  await flushPromises()
  expect(queryRoot.controller.state()).toEqual({location: seoulLocation, status: 'loading'})
})

it('should keep one whole preference edited while restoring', async () => {
  const stored = Promise.withResolvers<WeatherPreference>()
  preferenceMocks.readWeatherPreference.mockReturnValueOnce(stored.promise)
  const root = createWeatherRoot()
  root.controller.onLocationChange(busanLocation)
  stored.resolve({enabled: false, location: seoulLocation, sceneMode: 'rain'})
  await flushPromises()

  expect(root.controller.location()).toEqual(busanLocation)
  expect(root.controller.enabled()).toBe(true)
  expect(root.controller.sceneMode()).toBe('auto')
  expect(preferenceMocks.writeWeatherPreference).toHaveBeenLastCalledWith({
    enabled: true,
    location: busanLocation,
    sceneMode: 'auto',
  })
  root.dispose()
})

it('should retain incoming weather visibility and scene mode during restoration', async () => {
  const root = createWeatherRoot()
  root.controller.onEnabledChange(false)
  root.controller.onSceneModeChange('rain')
  await flushPromises()

  expect(root.controller.enabled()).toBe(false)
  expect(root.controller.sceneMode()).toBe('rain')
  expect(root.controller.location()).toEqual(seoulLocation)
  root.dispose()
})
