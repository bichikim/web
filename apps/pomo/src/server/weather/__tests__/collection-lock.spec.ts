import {expect, it, vi} from 'vitest'

import {
  getWeatherFeedState,
  hasCurrentWeather,
  lockWeatherCollection,
  ownsWeatherCollectionLease,
  recordWeatherCollectionFailure,
  resetWeatherCollectionFailure,
  setWeatherCollectionLease,
  type WeatherTransaction,
} from '../repository'
import type {Database} from '../../database'

const createTransaction = (records: ReadonlyArray<Record<string, unknown>> = []) => {
  const limit = vi.fn().mockResolvedValue(records)
  const where = vi.fn(() => ({limit}))
  const from = vi.fn(() => ({where}))
  const select = vi.fn(() => ({from}))
  const execute = vi.fn().mockResolvedValue([])
  const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined)
  const values = vi.fn(() => ({onConflictDoUpdate}))
  const insert = vi.fn(() => ({values}))
  const transaction = {execute, insert, select} as unknown as WeatherTransaction

  return {execute, insert, onConflictDoUpdate, transaction, values}
}

it('should take one transaction lock for a location', async () => {
  const {execute, transaction} = createTransaction()

  await lockWeatherCollection('seoul', transaction)

  expect(execute).toHaveBeenCalledOnce()
})

it.each([
  [true, true],
  [false, false],
] as const)(
  'should report whether the domain weather row is current',
  async (existing, expected) => {
    const {transaction} = createTransaction(existing ? [{id: 'weather-id'}] : [])

    await expect(
      hasCurrentWeather(
        'seoul',
        new Date('2026-08-22T05:00:00.000Z'),
        new Date('2026-08-22T05:45:00.000Z'),
        transaction,
      ),
    ).resolves.toBe(expected)
  },
)

it('should persist a complete collection lease', async () => {
  const {transaction, values} = createTransaction()
  const attemptedAt = new Date('2026-08-22T05:50:00.000Z')
  const lease = {
    expiresAt: new Date('2026-08-22T05:50:15.000Z'),
    key: 'weather-v1|seoul|observation-key|sky-key',
    token: '00000000-0000-4000-8000-000000000001',
  }

  await setWeatherCollectionLease('seoul', lease, attemptedAt, transaction)

  expect(values).toHaveBeenCalledWith({
    lastAttemptedAt: attemptedAt,
    leaseExpiresAt: lease.expiresAt,
    leaseKey: lease.key,
    leaseToken: lease.token,
    location: 'seoul',
  })
})

it.each([
  [
    {
      leaseKey: 'weather-v1|seoul|observation-key|sky-key',
      leaseToken: '00000000-0000-4000-8000-000000000001',
    },
    true,
  ],
  [
    {
      leaseKey: 'weather-v1|seoul|observation-key|sky-key',
      leaseToken: '00000000-0000-4000-8000-000000000002',
    },
    false,
  ],
] as const)('should fence completion with the lease key and token', async (record, expected) => {
  const {transaction} = createTransaction([record])
  const lease = {
    expiresAt: new Date('2026-08-22T05:50:15.000Z'),
    key: 'weather-v1|seoul|observation-key|sky-key',
    token: '00000000-0000-4000-8000-000000000001',
  }

  await expect(ownsWeatherCollectionLease('seoul', lease, transaction)).resolves.toBe(expected)
})

it.each([
  [undefined, 30],
  [1, 60],
  [2, 300],
] as const)(
  'should increase the persisted failure count with bounded retry delays',
  async (previousFailures, delaySeconds) => {
    const records =
      previousFailures === undefined
        ? []
        : [{consecutiveFailures: previousFailures, retryAfter: null}]
    const {insert, transaction, values} = createTransaction(records)
    const failedAt = new Date('2026-08-22T05:50:00.000Z')

    const retryAfter = await recordWeatherCollectionFailure('seoul', failedAt, transaction)

    expect(retryAfter.getTime() - failedAt.getTime()).toBe(delaySeconds * 1_000)
    expect(insert).toHaveBeenCalledOnce()
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({leaseExpiresAt: null, leaseKey: null, leaseToken: null}),
    )
  },
)

it('should reset the failure count and release the lease after collection', async () => {
  const {insert, onConflictDoUpdate, transaction} = createTransaction()

  await resetWeatherCollectionFailure('seoul', new Date('2026-08-22T05:50:00.000Z'), transaction)

  expect(insert).toHaveBeenCalledOnce()
  expect(onConflictDoUpdate).toHaveBeenCalledWith(
    expect.objectContaining({
      set: expect.objectContaining({leaseExpiresAt: null, leaseKey: null, leaseToken: null}),
    }),
  )
})

it.each([
  ['2026-08-22T05:44:59.000Z', 'outdated'],
  ['2026-08-22T05:45:00.000Z', 'current'],
] as const)(
  'should require collection from the latest observation or sky boundary',
  async (collectedAt, expectedStatus) => {
    const limit = vi.fn().mockResolvedValue([
      {
        collectedAt: new Date(collectedAt),
        humidityPercent: 50,
        id: 'weather-id',
        location: 'seoul',
        precipitation: 'none',
        precipitationMillimeters: 0,
        sky: 'clear',
        temperatureCelsius: 24,
        weatherAt: new Date('2026-08-22T05:00:00.000Z'),
        windSpeedMetersPerSecond: 2,
      },
    ])
    const orderBy = vi.fn(() => ({limit}))
    const where = vi.fn(() => ({orderBy}))
    const from = vi.fn(() => ({where}))
    const database = {select: vi.fn(() => ({from}))} as unknown as Database

    const state = await getWeatherFeedState('seoul', new Date('2026-08-22T05:50:00.000Z'), database)

    expect(state.status).toBe(expectedStatus)
  },
)
