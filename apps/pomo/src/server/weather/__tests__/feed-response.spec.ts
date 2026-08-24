import {beforeEach, expect, it, vi} from 'vitest'

import type {WeatherFeed} from 'src/features/weather'
import {createWeatherFeedResponse} from '../feed-response'

const mocks = vi.hoisted(() => ({getWeatherFeedState: vi.fn(), ingestWeatherCity: vi.fn()}))

vi.mock('../repository', () => ({getWeatherFeedState: mocks.getWeatherFeedState}))
vi.mock('../ingest-weather', () => ({ingestWeatherCity: mocks.ingestWeatherCity}))

const feed = {
  city: {label: '서울', slug: 'seoul'},
  current: {
    condition: 'clear',
    humidityPercent: 40,
    precipitationMillimeters: null,
    temperatureCelsius: 24,
  },
  expiresAt: '2026-08-22T02:00:00.000Z',
  observedAt: '2026-08-22T00:00:00.000Z',
  schemaVersion: 1,
  source: {name: '기상청', url: 'https://www.data.go.kr/data/15084084/openapi.do'},
  stale: false,
  updatedAt: '2026-08-22T00:00:00.000Z',
} satisfies WeatherFeed

beforeEach(() => {
  vi.clearAllMocks()
  mocks.ingestWeatherCity.mockResolvedValue({status: 'completed'})
})

it('should reject a city outside the configured public feed contract', async () => {
  const response = await createWeatherFeedResponse('tokyo')

  expect(response.status).toBe(404)
  await expect(response.json()).resolves.toEqual({code: 'weather_city_not_found'})
  expect(mocks.getWeatherFeedState).not.toHaveBeenCalled()
})

it('should return a retryable response before the first collection is available', async () => {
  mocks.getWeatherFeedState.mockResolvedValue({status: 'missing'})

  const response = await createWeatherFeedResponse('seoul')

  expect(response.status).toBe(503)
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  expect(mocks.ingestWeatherCity).toHaveBeenCalledWith('seoul', expect.any(Date))
})

it('should collect the requested city once when its feed has never been stored', async () => {
  mocks.getWeatherFeedState
    .mockResolvedValueOnce({status: 'missing'})
    .mockResolvedValueOnce({feed, status: 'current'})

  const response = await createWeatherFeedResponse('seoul')

  expect(mocks.ingestWeatherCity).toHaveBeenCalledTimes(1)
  expect(mocks.ingestWeatherCity).toHaveBeenCalledWith('seoul', expect.any(Date))
  expect(mocks.getWeatherFeedState).toHaveBeenCalledTimes(2)
  expect(response.status).toBe(200)
  await expect(response.json()).resolves.toEqual(feed)
})

it('should let the durable lease state coordinate concurrent requests', async () => {
  let finishCollection: () => void = () => undefined
  mocks.getWeatherFeedState
    .mockResolvedValueOnce({status: 'missing'})
    .mockResolvedValueOnce({status: 'missing'})
    .mockResolvedValueOnce({status: 'missing'})
    .mockResolvedValueOnce({feed, status: 'current'})
  mocks.ingestWeatherCity
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishCollection = () => resolve({status: 'completed'})
        }),
    )
    .mockResolvedValueOnce({
      retryAfter: new Date('2026-08-22T00:50:02.000Z'),
      status: 'collecting',
    })

  const now = new Date('2026-08-22T00:50:00.000Z')
  const firstResponse = createWeatherFeedResponse('seoul', now)
  await vi.waitFor(() => expect(mocks.ingestWeatherCity).toHaveBeenCalledTimes(1))
  const secondResponse = createWeatherFeedResponse('seoul', now)
  await vi.waitFor(() => expect(mocks.ingestWeatherCity).toHaveBeenCalledTimes(2))
  finishCollection()

  const [first, second] = await Promise.all([firstResponse, secondResponse])
  expect(first.status).toBe(200)
  expect(second.status).toBe(503)
  expect(second.headers.get('Retry-After')).toBe('2')
  await expect(second.json()).resolves.toEqual({code: 'weather_collecting'})
})

it('should return the versioned feed with shared cache policy', async () => {
  mocks.getWeatherFeedState.mockResolvedValue({feed, status: 'current'})

  const response = await createWeatherFeedResponse('seoul', new Date('2026-08-22T00:44:30.000Z'))

  expect(response.status).toBe(200)
  expect(response.headers.get('Cache-Control')).toBe('public, max-age=30, s-maxage=30')
  await expect(response.json()).resolves.toEqual(feed)
  expect(mocks.ingestWeatherCity).not.toHaveBeenCalled()
})

it('should refresh stored data after a new KMA issue becomes available', async () => {
  mocks.getWeatherFeedState
    .mockResolvedValueOnce({feed: {...feed, stale: true}, status: 'outdated'})
    .mockResolvedValueOnce({feed, status: 'current'})

  const response = await createWeatherFeedResponse('seoul')

  expect(response.status).toBe(200)
  expect(mocks.ingestWeatherCity).toHaveBeenCalledTimes(1)
  expect(mocks.getWeatherFeedState).toHaveBeenCalledTimes(2)
  await expect(response.json()).resolves.toEqual(feed)
})

it('should expose the persisted provider cooldown after an initial failure', async () => {
  const now = new Date('2026-08-22T00:50:00.000Z')
  const retryAfter = new Date('2026-08-22T00:50:30.000Z')
  mocks.getWeatherFeedState.mockResolvedValue({status: 'missing'})
  mocks.ingestWeatherCity.mockResolvedValue({
    error: new Error('provider unavailable'),
    retryAfter,
    status: 'failed',
  })

  const response = await createWeatherFeedResponse('seoul', now)

  expect(response.status).toBe(503)
  expect(response.headers.get('Retry-After')).toBe('30')
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  await expect(response.json()).resolves.toEqual({code: 'weather_unavailable'})
})

it('should ask an initial follower to poll while another instance collects', async () => {
  const now = new Date('2026-08-22T00:50:00.000Z')
  const retryAfter = new Date('2026-08-22T00:50:02.000Z')
  mocks.getWeatherFeedState.mockResolvedValue({status: 'missing'})
  mocks.ingestWeatherCity.mockResolvedValue({retryAfter, status: 'collecting'})

  const response = await createWeatherFeedResponse('seoul', now)

  expect(response.status).toBe(503)
  expect(response.headers.get('Retry-After')).toBe('2')
  expect(response.headers.get('Cache-Control')).toBe('no-store')
  await expect(response.json()).resolves.toEqual({code: 'weather_collecting'})
})

it('should serve stale weather briefly while another instance collects', async () => {
  const now = new Date('2026-08-22T00:50:00.000Z')
  const retryAfter = new Date('2026-08-22T00:50:02.000Z')
  const staleFeed = {...feed, stale: true}
  mocks.getWeatherFeedState.mockResolvedValue({feed: staleFeed, status: 'outdated'})
  mocks.ingestWeatherCity.mockResolvedValue({retryAfter, status: 'collecting'})

  const response = await createWeatherFeedResponse('seoul', now)

  expect(response.status).toBe(200)
  expect(response.headers.get('Cache-Control')).toBe('public, max-age=2, s-maxage=2')
  await expect(response.json()).resolves.toEqual({
    ...staleFeed,
    expiresAt: retryAfter.toISOString(),
  })
})

it('should preserve outdated weather when a refresh failure is recorded', async () => {
  const staleFeed = {...feed, stale: true}
  const retryAfter = new Date('2026-08-22T00:50:30.000Z')
  mocks.getWeatherFeedState.mockResolvedValue({feed: staleFeed, status: 'outdated'})
  mocks.ingestWeatherCity.mockResolvedValue({
    error: new Error('provider unavailable'),
    retryAfter,
    status: 'failed',
  })

  const response = await createWeatherFeedResponse('seoul', new Date('2026-08-22T00:50:00.000Z'))

  expect(response.status).toBe(200)
  expect(response.headers.get('Cache-Control')).toBe('public, max-age=30, s-maxage=30')
  await expect(response.json()).resolves.toEqual({
    ...staleFeed,
    expiresAt: retryAfter.toISOString(),
  })
})
