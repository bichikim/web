/** @vitest-environment jsdom */

import {createRoot} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

const clientMocks = vi.hoisted(() => ({fetchWeatherFeed: vi.fn()}))
const preferenceMocks = vi.hoisted(() => ({
  defaultPreference: {citySlug: 'seoul', enabled: true, sceneMode: 'auto' as const},
  readWeatherPreference: vi.fn(),
  writeWeatherPreference: vi.fn(),
}))

vi.mock('../client', () => ({fetchWeatherFeed: clientMocks.fetchWeatherFeed}))
vi.mock('../preference', () => ({
  DEFAULT_WEATHER_PREFERENCE: preferenceMocks.defaultPreference,
  readWeatherPreference: preferenceMocks.readWeatherPreference,
  writeWeatherPreference: preferenceMocks.writeWeatherPreference,
}))

import {type WeatherController, useWeather} from '../use-weather'

const NOW = new Date('2026-08-23T03:00:00.000Z')
const EXPIRES_AT = '2026-08-23T03:05:00.000Z'
const feed = {
  city: {label: '서울', slug: 'seoul'},
  current: {
    condition: 'clear',
    humidityPercent: 50,
    precipitationMillimeters: 0,
    temperatureCelsius: 24,
  },
  expiresAt: EXPIRES_AT,
  observedAt: '2026-08-23T02:50:00.000Z',
  schemaVersion: 1,
  source: {
    name: '기상청',
    url: 'https://www.data.go.kr/data/15084084/openapi.do',
  },
  stale: false,
  updatedAt: '2026-08-23T03:00:00.000Z',
} as const
const availableFeed = {feed, status: 'available'} as const

const createWeatherRoot = (): {
  readonly controller: WeatherController
  readonly dispose: () => void
} => {
  let disposeRoot: () => void = () => undefined
  const controller = createRoot((dispose) => {
    disposeRoot = dispose
    return useWeather()
  })

  return {controller, dispose: disposeRoot}
}

const flushPromises = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

beforeEach(() => {
  localStorage.clear()
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
  clientMocks.fetchWeatherFeed.mockReset()
  preferenceMocks.readWeatherPreference.mockReset()
  preferenceMocks.writeWeatherPreference.mockReset()
  Object.defineProperty(preferenceMocks.defaultPreference, 'enabled', {
    configurable: true,
    enumerable: true,
    value: true,
    writable: true,
  })
  preferenceMocks.readWeatherPreference.mockResolvedValue({
    citySlug: 'seoul',
    enabled: true,
    sceneMode: 'auto',
  })
  preferenceMocks.writeWeatherPreference.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
})

it('should refresh immediately after the server feed expires', async () => {
  clientMocks.fetchWeatherFeed.mockResolvedValue(availableFeed)
  const root = createWeatherRoot()
  await flushPromises()

  expect(root.controller.state()).toEqual({feed, status: 'ready'})
  expect(clientMocks.fetchWeatherFeed).toHaveBeenCalledTimes(1)

  await vi.advanceTimersByTimeAsync(300_999)
  expect(clientMocks.fetchWeatherFeed).toHaveBeenCalledTimes(1)

  await vi.advanceTimersByTimeAsync(1)
  expect(clientMocks.fetchWeatherFeed).toHaveBeenCalledTimes(2)
  root.dispose()
})

it('should preserve the last good feed when a refresh fails', async () => {
  let rejectRefresh: () => void = () => undefined
  const refreshFailure = new Promise<never>((_resolve, reject) => {
    rejectRefresh = () => reject(new Error('temporary network failure'))
  })
  clientMocks.fetchWeatherFeed
    .mockResolvedValueOnce(availableFeed)
    .mockReturnValueOnce(refreshFailure)
  const root = createWeatherRoot()
  await flushPromises()

  await vi.advanceTimersByTimeAsync(301_000)
  expect(root.controller.state()).toEqual({feed, status: 'ready'})

  rejectRefresh()
  await flushPromises()
  expect(root.controller.state()).toEqual({feed: {...feed, stale: true}, status: 'ready'})

  await vi.advanceTimersByTimeAsync(59_999)
  expect(clientMocks.fetchWeatherFeed).toHaveBeenCalledTimes(2)
  await vi.advanceTimersByTimeAsync(1)
  expect(clientMocks.fetchWeatherFeed).toHaveBeenCalledTimes(3)
  root.dispose()
})

it('should poll at the server delay while another instance collects', async () => {
  clientMocks.fetchWeatherFeed
    .mockResolvedValueOnce({retryAfterMilliseconds: 2_000, status: 'collecting'})
    .mockResolvedValueOnce(availableFeed)
  const root = createWeatherRoot()
  await flushPromises()

  expect(root.controller.state()).toEqual({citySlug: 'seoul', status: 'loading'})

  await vi.advanceTimersByTimeAsync(1_999)
  expect(clientMocks.fetchWeatherFeed).toHaveBeenCalledTimes(1)

  await vi.advanceTimersByTimeAsync(1)
  expect(clientMocks.fetchWeatherFeed).toHaveBeenCalledTimes(2)
  expect(root.controller.state()).toEqual({feed, status: 'ready'})
  root.dispose()
})

it('should hide weather status but keep loading weather for an automatic scene', async () => {
  const overcastFeed = {
    ...feed,
    current: {...feed.current, condition: 'overcast' as const},
  }
  preferenceMocks.readWeatherPreference.mockResolvedValueOnce({
    citySlug: 'seoul',
    enabled: false,
    sceneMode: 'auto',
  })
  clientMocks.fetchWeatherFeed.mockResolvedValueOnce({feed: overcastFeed, status: 'available'})
  const root = createWeatherRoot()

  await flushPromises()

  expect(root.controller.enabled()).toBe(false)
  expect(root.controller.state()).toEqual({status: 'disabled'})
  expect(root.controller.sceneCondition()).toBe('overcast')
  expect(clientMocks.fetchWeatherFeed).toHaveBeenCalledWith('seoul')
  root.dispose()
})

it('should refresh a newly selected city while automatic weather stays hidden', async () => {
  preferenceMocks.readWeatherPreference.mockResolvedValueOnce({
    citySlug: 'seoul',
    enabled: false,
    sceneMode: 'auto',
  })
  clientMocks.fetchWeatherFeed.mockResolvedValueOnce(availableFeed).mockResolvedValueOnce({
    feed: {...feed, city: {label: '부산', slug: 'busan'}},
    status: 'available',
  })
  const root = createWeatherRoot()
  await flushPromises()

  root.controller.onCityChange('busan')
  await flushPromises()

  expect(root.controller.citySlug()).toBe('busan')
  expect(root.controller.state()).toEqual({status: 'disabled'})
  expect(clientMocks.fetchWeatherFeed).toHaveBeenLastCalledWith('busan')
  expect(preferenceMocks.writeWeatherPreference).toHaveBeenLastCalledWith({
    citySlug: 'busan',
    enabled: false,
    sceneMode: 'auto',
  })
  root.dispose()
})

it('should start and stop a hidden feed when the scene changes between manual and automatic', async () => {
  preferenceMocks.readWeatherPreference.mockResolvedValueOnce({
    citySlug: 'seoul',
    enabled: false,
    sceneMode: 'cloudy',
  })
  clientMocks.fetchWeatherFeed.mockResolvedValue(availableFeed)
  const root = createWeatherRoot()

  await flushPromises()
  expect(clientMocks.fetchWeatherFeed).not.toHaveBeenCalled()
  expect(root.controller.sceneCondition()).toBe('cloudy')

  root.controller.onSceneModeChange('auto')
  await flushPromises()
  expect(clientMocks.fetchWeatherFeed).toHaveBeenCalledOnce()
  expect(root.controller.state()).toEqual({status: 'disabled'})
  expect(root.controller.sceneCondition()).toBe('clear')

  root.controller.onSceneModeChange('snow')
  expect(root.controller.sceneCondition()).toBe('snow')
  await vi.advanceTimersByTimeAsync(301_000)
  expect(clientMocks.fetchWeatherFeed).toHaveBeenCalledOnce()
  root.dispose()
})

it('should persist a city change, show loading, and ignore an older response', async () => {
  const initialRequest = Promise.withResolvers<typeof availableFeed>()
  const busanFeed = {...feed, city: {label: '부산', slug: 'busan'}} as const
  clientMocks.fetchWeatherFeed
    .mockReturnValueOnce(initialRequest.promise)
    .mockResolvedValueOnce({feed: busanFeed, status: 'available'})
  const root = createWeatherRoot()

  await flushPromises()
  root.controller.onCityChange('busan')

  expect(root.controller.citySlug()).toBe('busan')
  expect(root.controller.state()).toEqual({citySlug: 'busan', status: 'loading'})
  expect(preferenceMocks.writeWeatherPreference).toHaveBeenCalledWith({
    citySlug: 'busan',
    enabled: true,
    sceneMode: 'auto',
  })
  expect(clientMocks.fetchWeatherFeed).toHaveBeenLastCalledWith('busan')

  initialRequest.resolve(availableFeed)
  await flushPromises()

  expect(root.controller.state()).toEqual({feed: busanFeed, status: 'ready'})
  root.dispose()
})

it('should persist a scene mode without refetching and resolve its scene condition', async () => {
  clientMocks.fetchWeatherFeed.mockResolvedValue(availableFeed)
  const root = createWeatherRoot()
  await flushPromises()

  expect(root.controller.sceneMode()).toBe('auto')
  expect(root.controller.sceneCondition()).toBe('clear')

  root.controller.onSceneModeChange('snow')

  expect(root.controller.sceneMode()).toBe('snow')
  expect(root.controller.sceneCondition()).toBe('snow')
  expect(preferenceMocks.writeWeatherPreference).toHaveBeenLastCalledWith({
    citySlug: 'seoul',
    enabled: true,
    sceneMode: 'snow',
  })
  expect(clientMocks.fetchWeatherFeed).toHaveBeenCalledOnce()
  root.dispose()
})

it('should keep a fresh cached feed while collecting and use the default retry delay', async () => {
  clientMocks.fetchWeatherFeed
    .mockResolvedValueOnce(availableFeed)
    .mockResolvedValueOnce({retryAfterMilliseconds: null, status: 'collecting'})
    .mockResolvedValueOnce(availableFeed)
  const root = createWeatherRoot()
  await flushPromises()

  root.controller.onCityChange('seoul')
  await flushPromises()

  expect(root.controller.state()).toEqual({feed, status: 'ready'})
  await vi.advanceTimersByTimeAsync(59_999)
  expect(clientMocks.fetchWeatherFeed).toHaveBeenCalledTimes(2)
  await vi.advanceTimersByTimeAsync(1)
  expect(clientMocks.fetchWeatherFeed).toHaveBeenCalledTimes(3)
  root.dispose()
})

it('should keep a fresh cached feed when the provider is unavailable', async () => {
  clientMocks.fetchWeatherFeed
    .mockResolvedValueOnce(availableFeed)
    .mockResolvedValueOnce({retryAfterMilliseconds: 2_000, status: 'unavailable'})
  const root = createWeatherRoot()
  await flushPromises()

  root.controller.onCityChange('seoul')
  await flushPromises()

  expect(root.controller.state()).toEqual({feed, status: 'ready'})
  await vi.advanceTimersByTimeAsync(2_000)
  expect(clientMocks.fetchWeatherFeed).toHaveBeenCalledTimes(3)
  root.dispose()
})

it('should report unavailable and rejected initial weather fetches', async () => {
  clientMocks.fetchWeatherFeed.mockResolvedValueOnce({
    retryAfterMilliseconds: null,
    status: 'unavailable',
  })
  const unavailableRoot = createWeatherRoot()
  await flushPromises()

  expect(unavailableRoot.controller.state()).toEqual({citySlug: 'seoul', status: 'error'})
  unavailableRoot.dispose()

  clientMocks.fetchWeatherFeed.mockRejectedValueOnce(new Error('network unavailable'))
  const failedRoot = createWeatherRoot()
  await flushPromises()

  expect(failedRoot.controller.state()).toEqual({citySlug: 'seoul', status: 'error'})
  failedRoot.dispose()
})

it('should retry when reading the stored preference fails', async () => {
  preferenceMocks.readWeatherPreference.mockRejectedValueOnce(new Error('storage unavailable'))
  clientMocks.fetchWeatherFeed.mockResolvedValueOnce(availableFeed)
  const root = createWeatherRoot()

  await flushPromises()

  expect(clientMocks.fetchWeatherFeed).toHaveBeenCalledWith('seoul')
  expect(root.controller.state()).toEqual({feed, status: 'ready'})
  root.dispose()
})

it('should ignore persisted preferences and responses after the controller is disposed', async () => {
  const storedPreference = Promise.withResolvers<{
    citySlug: 'busan'
    enabled: boolean
    sceneMode: 'auto'
  }>()
  const weatherRequest = Promise.withResolvers<typeof availableFeed>()
  preferenceMocks.readWeatherPreference.mockReturnValueOnce(storedPreference.promise)
  clientMocks.fetchWeatherFeed.mockReturnValueOnce(weatherRequest.promise)
  const root = createWeatherRoot()

  root.controller.onCityChange('seoul')
  await flushPromises()
  root.dispose()
  storedPreference.resolve({citySlug: 'busan', enabled: true, sceneMode: 'auto'})
  weatherRequest.resolve(availableFeed)
  await flushPromises()

  expect(root.controller.citySlug()).toBe('seoul')
  expect(root.controller.state()).toEqual({citySlug: 'seoul', status: 'loading'})
})

it('should ignore unexpected weather-result variants and failed preference writes', async () => {
  preferenceMocks.writeWeatherPreference.mockRejectedValueOnce(new Error('storage unavailable'))
  clientMocks.fetchWeatherFeed
    .mockResolvedValueOnce(availableFeed)
    .mockResolvedValueOnce({status: 'unexpected'})
  const root = createWeatherRoot()
  await flushPromises()

  root.controller.onCityChange('seoul')
  await flushPromises()

  expect(root.controller.enabled()).toBe(true)
  expect(root.controller.state()).toEqual({feed, status: 'ready'})
  root.dispose()
})

it('should run a scheduled refresh callback', async () => {
  clientMocks.fetchWeatherFeed.mockResolvedValue(availableFeed)
  const root = createWeatherRoot()
  await flushPromises()

  const clearTimer = vi.spyOn(window, 'clearTimeout').mockImplementation(() => {
    throw new Error('timer unavailable')
  })
  await vi.advanceTimersByTimeAsync(301_000)
  await flushPromises()
  clearTimer.mockRestore()

  expect(clientMocks.fetchWeatherFeed).toHaveBeenCalledOnce()
  root.dispose()
})

it('should swallow refresh setup errors after a city change', async () => {
  clientMocks.fetchWeatherFeed.mockResolvedValueOnce(availableFeed)
  const root = createWeatherRoot()
  await flushPromises()

  const clearTimer = vi.spyOn(window, 'clearTimeout').mockImplementation(() => {
    throw new Error('timer unavailable')
  })
  root.controller.onCityChange('busan')
  await flushPromises()
  clearTimer.mockRestore()

  expect(root.controller.citySlug()).toBe('busan')
  root.dispose()
})

it('should swallow refresh setup errors after the feed is disabled', async () => {
  clientMocks.fetchWeatherFeed.mockResolvedValueOnce(availableFeed)
  const root = createWeatherRoot()
  await flushPromises()

  root.controller.onSceneModeChange('snow')
  const clearTimer = vi.spyOn(window, 'clearTimeout').mockImplementation(() => {
    throw new Error('timer unavailable')
  })
  root.controller.onEnabledChange(false)
  await flushPromises()
  clearTimer.mockRestore()

  expect(root.controller.state()).toEqual({status: 'disabled'})
  root.dispose()
})

it('should swallow refresh setup errors after stored preferences load', async () => {
  const invalidPreference = {citySlug: 'seoul', enabled: false, sceneMode: 'auto' as const}
  Object.defineProperty(invalidPreference, 'sceneMode', {
    get: () => {
      throw new Error('invalid preference')
    },
  })
  preferenceMocks.readWeatherPreference.mockResolvedValueOnce(invalidPreference)
  const storedRoot = createWeatherRoot()
  await flushPromises()

  expect(storedRoot.controller.state()).toEqual({status: 'disabled'})
  storedRoot.dispose()
})

it('should suppress retries that fail after disposal', async () => {
  const rejectedRequest = Promise.withResolvers<typeof availableFeed>()
  clientMocks.fetchWeatherFeed.mockReturnValueOnce(rejectedRequest.promise)
  const requestRoot = createWeatherRoot()
  await flushPromises()
  requestRoot.dispose()
  rejectedRequest.reject(new Error('network unavailable'))
  await flushPromises()

  const storedPreference = Promise.withResolvers<{
    citySlug: 'seoul'
    enabled: boolean
    sceneMode: 'auto'
  }>()
  preferenceMocks.readWeatherPreference.mockReturnValueOnce(storedPreference.promise)
  const preferenceRoot = createWeatherRoot()
  preferenceRoot.dispose()
  storedPreference.reject(new Error('storage unavailable'))
  await flushPromises()

  expect(clientMocks.fetchWeatherFeed).toHaveBeenCalledTimes(1)
})

it('should swallow a failed fallback refresh after preference loading fails', async () => {
  preferenceMocks.readWeatherPreference.mockRejectedValueOnce(new Error('storage unavailable'))
  Object.defineProperty(preferenceMocks.defaultPreference, 'enabled', {
    configurable: true,
    get: () => {
      throw new Error('invalid default preference')
    },
  })
  const root = createWeatherRoot()

  await flushPromises()

  expect(root.controller.state()).toEqual({citySlug: 'seoul', status: 'loading'})
  root.dispose()
})
