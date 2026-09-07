import {beforeEach, expect, it, vi} from 'vitest'

const databaseMocks = vi.hoisted(() => ({
  getDatabase: vi.fn(),
  withTransactionalDatabase: vi.fn(),
}))
const providerMocks = vi.hoisted(() => ({fetchOpenWeatherCurrent: vi.fn()}))
const quotaMocks = vi.hoisted(() => ({reserveOpenWeatherRequest: vi.fn()}))
const locationMocks = vi.hoisted(() => ({getPublicWeatherLocation: vi.fn()}))
const repositoryMocks = vi.hoisted(() => ({
  createCurrentWeather: vi.fn(),
  getLatestWeather: vi.fn(),
  getWeatherCollectionState: vi.fn(),
  lockWeatherCollection: vi.fn(),
  ownsWeatherCollectionLease: vi.fn(),
  recordWeatherCollectionFailure: vi.fn(),
  resetWeatherCollectionFailure: vi.fn(),
  saveWeather: vi.fn(),
  setWeatherCollectionLease: vi.fn(),
}))

vi.mock('../../database', () => databaseMocks)
vi.mock('../openweather-client', () => providerMocks)
vi.mock('../provider-quota', () => quotaMocks)
vi.mock('../world-locations', () => locationMocks)
vi.mock('../repository', () => repositoryMocks)

import {
  getWorldWeatherFeedState,
  ingestWorldWeather,
  WORLD_WEATHER_REFRESH_MILLISECONDS,
} from '../world-weather'

const NOW = new Date('2026-08-29T03:00:00.000Z')
const location = {
  country: 'Japan',
  id: 'openweather:35.6900,139.6900',
  latitude: 35.69,
  longitude: 139.69,
  name: 'Tokyo',
  providerLocationId: '35.6900,139.6900',
  region: 'Tokyo',
} as const
const publicLocation = {
  country: 'Japan',
  id: 'openweather:35.6900,139.6900',
  name: 'Tokyo',
  region: 'Tokyo',
} as const
const record = {
  collectedAt: NOW,
  humidityPercent: 50,
  id: 'weather-id',
  location: location.id,
  precipitation: 'none',
  precipitationMillimeters: 0,
  sky: 'clear',
  temperatureCelsius: 25,
  weatherAt: new Date('2026-08-29T02:45:00.000Z'),
  windSpeedMetersPerSecond: 2,
} as const
const current = {
  humidityPercent: 50,
  observedAt: record.weatherAt,
  precipitation: 'none',
  precipitationMillimeters: 0,
  sky: 'clear',
  temperatureCelsius: 25,
  windSpeedMetersPerSecond: 2,
} as const

let transaction: {transaction: ReturnType<typeof vi.fn>}

beforeEach(() => {
  vi.clearAllMocks()
  transaction = {
    transaction: vi.fn(async (operation) => operation({name: 'savepoint'})),
  }
  const database = {
    transaction: vi.fn(async (operation) => operation(transaction)),
  }
  databaseMocks.getDatabase.mockReturnValue({name: 'http-database'})
  databaseMocks.withTransactionalDatabase.mockImplementation(async (operation) =>
    operation(database),
  )
  locationMocks.getPublicWeatherLocation.mockReturnValue(publicLocation)
  repositoryMocks.createCurrentWeather.mockReturnValue({
    condition: 'clear',
    humidityPercent: 50,
    precipitationMillimeters: 0,
    temperatureCelsius: 25,
  })
  repositoryMocks.getLatestWeather.mockResolvedValue(undefined)
  repositoryMocks.getWeatherCollectionState.mockResolvedValue(undefined)
  repositoryMocks.lockWeatherCollection.mockResolvedValue(undefined)
  repositoryMocks.ownsWeatherCollectionLease.mockResolvedValue(true)
  repositoryMocks.recordWeatherCollectionFailure.mockResolvedValue(new Date(NOW.getTime() + 30_000))
  repositoryMocks.resetWeatherCollectionFailure.mockResolvedValue(undefined)
  repositoryMocks.saveWeather.mockResolvedValue(undefined)
  repositoryMocks.setWeatherCollectionLease.mockResolvedValue(undefined)
  quotaMocks.reserveOpenWeatherRequest.mockResolvedValue(undefined)
  providerMocks.fetchOpenWeatherCurrent.mockResolvedValue(current)
})

it('should distinguish missing, current, and outdated cached world weather', async () => {
  await expect(
    getWorldWeatherFeedState(location, NOW, {name: 'database'} as never),
  ).resolves.toEqual({status: 'missing'})

  repositoryMocks.getLatestWeather.mockResolvedValueOnce(record)
  const currentState = await getWorldWeatherFeedState(location, NOW, {name: 'database'} as never)
  expect(currentState).toEqual({
    feed: expect.objectContaining({
      expiresAt: new Date(NOW.getTime() + WORLD_WEATHER_REFRESH_MILLISECONDS).toISOString(),
      location: publicLocation,
      schemaVersion: 2,
      source: {name: 'OpenWeather', url: 'https://openweathermap.org/'},
      stale: false,
    }),
    status: 'current',
  })

  repositoryMocks.getLatestWeather.mockResolvedValueOnce({
    ...record,
    collectedAt: new Date(NOW.getTime() - WORLD_WEATHER_REFRESH_MILLISECONDS - 1),
  })
  await expect(
    getWorldWeatherFeedState(location, NOW, {name: 'database'} as never),
  ).resolves.toMatchObject({feed: {stale: true}, status: 'outdated'})
})

it('should avoid collection when a current row already exists', async () => {
  repositoryMocks.getLatestWeather.mockResolvedValue(record)

  await expect(ingestWorldWeather(location, NOW)).resolves.toEqual({status: 'current'})
  expect(quotaMocks.reserveOpenWeatherRequest).not.toHaveBeenCalled()
})

it('should preserve a provider cooldown before taking a new lease', async () => {
  const retryAfter = new Date(NOW.getTime() + 30_000)
  repositoryMocks.getWeatherCollectionState.mockResolvedValue({retryAfter})

  await expect(ingestWorldWeather(location, NOW)).resolves.toEqual({
    retryAfter,
    status: 'cooldown',
  })
})

it.each([
  [1_000, 1_000],
  [20_000, 2_000],
] as const)(
  'should poll an active lease within %i milliseconds',
  async (leaseDelay, retryDelay) => {
    repositoryMocks.getWeatherCollectionState.mockResolvedValue({
      leaseExpiresAt: new Date(NOW.getTime() + leaseDelay),
      retryAfter: null,
    })

    await expect(ingestWorldWeather(location, NOW)).resolves.toEqual({
      retryAfter: new Date(NOW.getTime() + retryDelay),
      status: 'collecting',
    })
  },
)

it('should reserve the quota, fetch fixed coordinates, and save a completed collection', async () => {
  await expect(ingestWorldWeather(location, NOW)).resolves.toEqual({status: 'completed'})

  expect(repositoryMocks.setWeatherCollectionLease).toHaveBeenCalledWith(
    location.id,
    expect.objectContaining({
      expiresAt: new Date(NOW.getTime() + 15_000),
      key: expect.stringContaining(`openweather-v1|${location.id}|`),
      token: expect.any(String),
    }),
    NOW,
    transaction,
  )
  expect(quotaMocks.reserveOpenWeatherRequest).toHaveBeenCalledWith('current', NOW)
  expect(providerMocks.fetchOpenWeatherCurrent).toHaveBeenCalledWith({
    latitude: location.latitude,
    longitude: location.longitude,
  })
  expect(repositoryMocks.saveWeather).toHaveBeenCalledWith(
    expect.objectContaining({
      collectedAt: NOW,
      location: location.id,
      weatherAt: current.observedAt,
    }),
    {name: 'savepoint'},
  )
  expect(repositoryMocks.resetWeatherCollectionFailure).toHaveBeenCalled()
})

it('should let another collector finish after the acquired lease changes', async () => {
  repositoryMocks.ownsWeatherCollectionLease.mockResolvedValue(false)

  await expect(ingestWorldWeather(location, NOW)).resolves.toEqual({
    retryAfter: new Date(NOW.getTime() + 2_000),
    status: 'collecting',
  })
  expect(repositoryMocks.saveWeather).not.toHaveBeenCalled()
})

it('should record a fenced provider request failure', async () => {
  const error = new Error('provider unavailable')
  providerMocks.fetchOpenWeatherCurrent.mockRejectedValue(error)

  await expect(ingestWorldWeather(location, NOW)).resolves.toEqual({
    error,
    retryAfter: new Date(NOW.getTime() + 30_000),
    status: 'failed',
  })
  expect(repositoryMocks.recordWeatherCollectionFailure).toHaveBeenCalled()
})

it('should defer a provider failure after losing its lease', async () => {
  providerMocks.fetchOpenWeatherCurrent.mockRejectedValue(new Error('provider unavailable'))
  repositoryMocks.ownsWeatherCollectionLease.mockResolvedValue(false)

  await expect(ingestWorldWeather(location, NOW)).resolves.toEqual({
    retryAfter: new Date(NOW.getTime() + 2_000),
    status: 'collecting',
  })
  expect(repositoryMocks.recordWeatherCollectionFailure).not.toHaveBeenCalled()
})

it('should record a savepoint failure before releasing the lease', async () => {
  const error = new Error('database unavailable')
  repositoryMocks.saveWeather.mockRejectedValue(error)

  await expect(ingestWorldWeather(location, NOW)).resolves.toEqual({
    error,
    retryAfter: new Date(NOW.getTime() + 30_000),
    status: 'failed',
  })
  expect(repositoryMocks.resetWeatherCollectionFailure).not.toHaveBeenCalled()
})
