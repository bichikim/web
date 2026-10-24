/** @vitest-environment node */
import {beforeEach, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({getLatestWeather: vi.fn()}))

vi.mock('src/env', () => ({
  env: {},
}))
vi.mock('../../database', () => ({getDatabase: vi.fn()}))
vi.mock('../../repositories/weather', () => ({getLatestWeather: mocks.getLatestWeather}))

import {getWeatherFeedState} from '../get-weather-feed-state'

const now = new Date('2026-08-22T05:50:00.000Z')
const record = {
  collectedAt: new Date('2026-08-22T05:50:00.000Z'),
  humidityPercent: 50,
  id: 'weather-id',
  location: 'seoul',
  precipitation: 'none' as const,
  precipitationMillimeters: 0,
  sky: 'clear' as const,
  temperatureCelsius: 24,
  weatherAt: new Date('2026-08-22T05:00:00.000Z'),
  windSpeedMetersPerSecond: 2,
}

beforeEach(() => {
  vi.clearAllMocks()
})

it('should report missing weather when no row has been collected', async () => {
  mocks.getLatestWeather.mockResolvedValue(undefined)

  await expect(getWeatherFeedState('seoul', now, {name: 'database'} as never)).resolves.toEqual({
    status: 'missing',
  })
})

it.each([
  ['2026-08-22T05:44:59.000Z', 'outdated'],
  ['2026-08-22T05:45:00.000Z', 'current'],
] as const)(
  'should require collection from the latest observation or sky boundary',
  async (collectedAt, expectedStatus) => {
    mocks.getLatestWeather.mockResolvedValue({
      ...record,
      collectedAt: new Date(collectedAt),
    })

    const state = await getWeatherFeedState('seoul', now, {name: 'database'} as never)

    expect(state.status).toBe(expectedStatus)
  },
)

it('should assemble the public KMA feed from the stored row', async () => {
  mocks.getLatestWeather.mockResolvedValue(record)

  await expect(
    getWeatherFeedState('seoul', now, {name: 'database'} as never),
  ).resolves.toMatchObject({
    feed: {
      city: {slug: 'seoul'},
      current: {
        condition: 'clear',
        humidityPercent: 50,
        precipitationMillimeters: 0,
        temperatureCelsius: 24,
      },
      observedAt: record.weatherAt.toISOString(),
      schemaVersion: 1,
      source: {name: '기상청'},
      stale: false,
      updatedAt: record.collectedAt.toISOString(),
    },
    status: 'current',
  })
})
