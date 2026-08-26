import {beforeEach, expect, it, vi} from 'vitest'

import {ingestWeatherCity} from '../ingest-weather'

const mocks = vi.hoisted(() => ({
  fetchKmaObservation: vi.fn(),
  fetchKmaSky: vi.fn(),
  getWeatherCollectionState: vi.fn(),
  hasCurrentWeather: vi.fn(),
  lockWeatherCollection: vi.fn(),
  ownsWeatherCollectionLease: vi.fn(),
  recordWeatherCollectionFailure: vi.fn(),
  resetWeatherCollectionFailure: vi.fn(),
  saveWeather: vi.fn(),
  setWeatherCollectionLease: vi.fn(),
  withTransactionalDatabase: vi.fn(),
}))

vi.mock('../../database', () => ({withTransactionalDatabase: mocks.withTransactionalDatabase}))
vi.mock('../kma-client', () => ({
  fetchKmaObservation: mocks.fetchKmaObservation,
  fetchKmaSky: mocks.fetchKmaSky,
}))
vi.mock('../repository', () => ({
  getWeatherCollectionState: mocks.getWeatherCollectionState,
  hasCurrentWeather: mocks.hasCurrentWeather,
  lockWeatherCollection: mocks.lockWeatherCollection,
  ownsWeatherCollectionLease: mocks.ownsWeatherCollectionLease,
  recordWeatherCollectionFailure: mocks.recordWeatherCollectionFailure,
  resetWeatherCollectionFailure: mocks.resetWeatherCollectionFailure,
  saveWeather: mocks.saveWeather,
  setWeatherCollectionLease: mocks.setWeatherCollectionLease,
}))

let activeTransactions = 0
const savepoint = {}
const transaction = {
  transaction: vi.fn(async (operation: (value: typeof savepoint) => Promise<unknown>) =>
    operation(savepoint),
  ),
}
const database = {
  transaction: vi.fn(async (operation: (value: typeof transaction) => Promise<unknown>) => {
    activeTransactions += 1
    try {
      return await operation(transaction)
    } finally {
      activeTransactions -= 1
    }
  }),
}
const observation = {
  humidityPercent: 50,
  observedAt: new Date('2026-08-22T05:00:00.000Z'),
  precipitation: 'none',
  precipitationMillimeters: 0,
  sourceIssuedAt: new Date('2026-08-22T05:00:00.000Z'),
  temperatureCelsius: 24,
  windSpeedMetersPerSecond: 2,
}

beforeEach(() => {
  vi.clearAllMocks()
  activeTransactions = 0
  mocks.withTransactionalDatabase.mockImplementation(async (operation) => operation(database))
  mocks.lockWeatherCollection.mockResolvedValue(undefined)
  mocks.hasCurrentWeather.mockResolvedValue(false)
  mocks.getWeatherCollectionState.mockResolvedValue(undefined)
  mocks.fetchKmaObservation.mockImplementation(async () => {
    expect(activeTransactions).toBe(0)
    return observation
  })
  mocks.fetchKmaSky.mockImplementation(async () => {
    expect(activeTransactions).toBe(0)
    return 'cloudy'
  })
  mocks.ownsWeatherCollectionLease.mockResolvedValue(true)
  mocks.recordWeatherCollectionFailure.mockResolvedValue(new Date('2026-08-22T05:50:30.000Z'))
  mocks.resetWeatherCollectionFailure.mockResolvedValue(undefined)
  mocks.saveWeather.mockResolvedValue(undefined)
  mocks.setWeatherCollectionLease.mockResolvedValue(undefined)
})

it('should release the claim transaction before collecting and store one weather row', async () => {
  const now = new Date('2026-08-22T05:50:00.000Z')

  await expect(ingestWeatherCity('seoul', now)).resolves.toEqual({status: 'completed'})

  expect(database.transaction).toHaveBeenCalledTimes(2)
  expect(mocks.lockWeatherCollection).toHaveBeenCalledTimes(2)
  expect(mocks.hasCurrentWeather).toHaveBeenCalledWith(
    'seoul',
    new Date('2026-08-22T05:00:00.000Z'),
    new Date('2026-08-22T05:45:00.000Z'),
    transaction,
  )
  expect(mocks.setWeatherCollectionLease).toHaveBeenCalledWith(
    'seoul',
    {
      expiresAt: new Date('2026-08-22T05:50:15.000Z'),
      key: 'weather-v1|seoul|observation:60:127:20260822:1400|sky:60:127:20260822:1430',
      token: expect.any(String),
    },
    now,
    transaction,
  )
  expect(mocks.saveWeather).toHaveBeenCalledWith(
    {
      collectedAt: now,
      humidityPercent: 50,
      location: 'seoul',
      precipitation: 'none',
      precipitationMillimeters: 0,
      sky: 'cloudy',
      temperatureCelsius: 24,
      weatherAt: new Date('2026-08-22T05:00:00.000Z'),
      windSpeedMetersPerSecond: 2,
    },
    savepoint,
  )
  expect(mocks.resetWeatherCollectionFailure).toHaveBeenCalledWith('seoul', now, transaction)
})

it('should skip collection when the locked weather row is already current', async () => {
  mocks.hasCurrentWeather.mockResolvedValue(true)

  await expect(ingestWeatherCity('seoul', new Date('2026-08-22T05:50:00.000Z'))).resolves.toEqual({
    status: 'current',
  })

  expect(database.transaction).toHaveBeenCalledOnce()
  expect(mocks.setWeatherCollectionLease).not.toHaveBeenCalled()
  expect(mocks.fetchKmaObservation).not.toHaveBeenCalled()
})

it('should use the current time when none is supplied', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-08-22T05:50:00.000Z'))
  mocks.hasCurrentWeather.mockResolvedValue(true)

  await expect(ingestWeatherCity('seoul')).resolves.toEqual({status: 'current'})
  expect(mocks.hasCurrentWeather).toHaveBeenCalledWith(
    'seoul',
    new Date('2026-08-22T05:00:00.000Z'),
    new Date('2026-08-22T05:45:00.000Z'),
    transaction,
  )
  vi.useRealTimers()
})

it('should return quickly while another instance owns a live lease', async () => {
  mocks.getWeatherCollectionState.mockResolvedValue({
    leaseExpiresAt: new Date('2026-08-22T05:50:15.000Z'),
    retryAfter: null,
  })

  await expect(ingestWeatherCity('seoul', new Date('2026-08-22T05:50:00.000Z'))).resolves.toEqual({
    retryAfter: new Date('2026-08-22T05:50:02.000Z'),
    status: 'collecting',
  })

  expect(database.transaction).toHaveBeenCalledOnce()
  expect(mocks.setWeatherCollectionLease).not.toHaveBeenCalled()
  expect(mocks.fetchKmaObservation).not.toHaveBeenCalled()
})

it('should reclaim an expired lease', async () => {
  mocks.getWeatherCollectionState.mockResolvedValue({
    leaseExpiresAt: new Date('2026-08-22T05:49:59.000Z'),
    retryAfter: null,
  })

  await expect(ingestWeatherCity('seoul', new Date('2026-08-22T05:50:00.000Z'))).resolves.toEqual({
    status: 'completed',
  })

  expect(mocks.setWeatherCollectionLease).toHaveBeenCalledOnce()
  expect(mocks.fetchKmaObservation).toHaveBeenCalledOnce()
})

it('should record a provider failure in a new short transaction', async () => {
  const now = new Date('2026-08-22T05:50:00.000Z')
  const providerError = new Error('provider unavailable')
  mocks.fetchKmaSky.mockRejectedValue(providerError)

  await expect(ingestWeatherCity('seoul', now)).resolves.toEqual({
    error: providerError,
    retryAfter: new Date('2026-08-22T05:50:30.000Z'),
    status: 'failed',
  })

  expect(database.transaction).toHaveBeenCalledTimes(2)
  expect(mocks.ownsWeatherCollectionLease).toHaveBeenCalledOnce()
  expect(mocks.recordWeatherCollectionFailure).toHaveBeenCalledWith('seoul', now, transaction)
  expect(mocks.saveWeather).not.toHaveBeenCalled()
})

it('should defer a provider failure after another instance replaces the lease', async () => {
  const now = new Date('2026-08-22T05:50:00.000Z')
  mocks.fetchKmaSky.mockRejectedValue(new Error('provider unavailable'))
  mocks.ownsWeatherCollectionLease.mockResolvedValue(false)

  await expect(ingestWeatherCity('seoul', now)).resolves.toEqual({
    retryAfter: new Date('2026-08-22T05:50:02.000Z'),
    status: 'collecting',
  })
  expect(mocks.recordWeatherCollectionFailure).not.toHaveBeenCalled()
})

it('should roll back only the weather save and persist its failure count', async () => {
  const now = new Date('2026-08-22T05:50:00.000Z')
  const saveError = new Error('weather constraint failed')
  mocks.saveWeather.mockRejectedValue(saveError)

  await expect(ingestWeatherCity('seoul', now)).resolves.toEqual({
    error: saveError,
    retryAfter: new Date('2026-08-22T05:50:30.000Z'),
    status: 'failed',
  })

  expect(transaction.transaction).toHaveBeenCalledOnce()
  expect(mocks.recordWeatherCollectionFailure).toHaveBeenCalledWith('seoul', now, transaction)
  expect(mocks.resetWeatherCollectionFailure).not.toHaveBeenCalled()
})

it('should record a rejected save transaction in a new transaction', async () => {
  const now = new Date('2026-08-22T05:50:00.000Z')
  const transactionError = new Error('transaction connection failed')
  mocks.withTransactionalDatabase
    .mockImplementationOnce(async (operation) => operation(database))
    .mockRejectedValueOnce(transactionError)
    .mockImplementationOnce(async (operation) => operation(database))

  await expect(ingestWeatherCity('seoul', now)).resolves.toEqual({
    error: transactionError,
    retryAfter: new Date('2026-08-22T05:50:30.000Z'),
    status: 'failed',
  })

  expect(mocks.withTransactionalDatabase).toHaveBeenCalledTimes(3)
  expect(mocks.recordWeatherCollectionFailure).toHaveBeenCalledWith('seoul', now, transaction)
})

it('should refuse to save after another instance replaces the lease token', async () => {
  mocks.ownsWeatherCollectionLease.mockResolvedValue(false)

  await expect(ingestWeatherCity('seoul', new Date('2026-08-22T05:50:00.000Z'))).resolves.toEqual({
    retryAfter: new Date('2026-08-22T05:50:02.000Z'),
    status: 'collecting',
  })

  expect(mocks.saveWeather).not.toHaveBeenCalled()
  expect(mocks.resetWeatherCollectionFailure).not.toHaveBeenCalled()
})

it('should honor the shared retry cooldown before acquiring a lease', async () => {
  const retryAfter = new Date('2026-08-22T05:55:00.000Z')
  mocks.getWeatherCollectionState.mockResolvedValue({leaseExpiresAt: null, retryAfter})

  await expect(ingestWeatherCity('seoul', new Date('2026-08-22T05:50:00.000Z'))).resolves.toEqual({
    retryAfter,
    status: 'cooldown',
  })

  expect(mocks.setWeatherCollectionLease).not.toHaveBeenCalled()
  expect(mocks.fetchKmaObservation).not.toHaveBeenCalled()
  expect(mocks.recordWeatherCollectionFailure).not.toHaveBeenCalled()
})
