/** @vitest-environment jsdom */

import {createRoot} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

const clientMocks = vi.hoisted(() => ({fetchWeatherFeed: vi.fn()}))

vi.mock('../client', () => ({fetchWeatherFeed: clientMocks.fetchWeatherFeed}))

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
