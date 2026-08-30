import {beforeEach, expect, it, vi} from 'vitest'
import type {SQL} from 'drizzle-orm'
import {PgDialect} from 'drizzle-orm/pg-core'

vi.mock('src/env', () => ({
  env: {},
}))

import {
  OPENWEATHER_MONTHLY_CURRENT_LIMIT,
  OPENWEATHER_MONTHLY_REQUEST_LIMIT,
  OPENWEATHER_MONTHLY_SEARCH_LIMIT,
  OPENWEATHER_PER_MINUTE_REQUEST_LIMIT,
  reserveOpenWeatherRequest,
} from '../provider-quota'

const compile = (statement: SQL) => new PgDialect({casing: 'snake_case'}).sqlToQuery(statement)

const createDatabase = (result: ReadonlyArray<{readonly billingMonth: string}>) => {
  const returning = vi.fn().mockResolvedValue(result)
  const onConflictDoUpdate = vi.fn((_options: unknown) => ({returning}))
  const values = vi.fn(() => ({onConflictDoUpdate}))
  const insert = vi.fn(() => ({values}))
  return {database: {insert} as never, insert, onConflictDoUpdate, returning, values}
}

beforeEach(() => {
  vi.clearAllMocks()
})

it.each(['current', 'search'] as const)(
  'should reserve one %s request in the UTC month',
  async (kind) => {
    const mocks = createDatabase([{billingMonth: '2026-08'}])

    await reserveOpenWeatherRequest(kind, new Date('2026-08-31T23:59:59.000Z'), mocks.database)

    expect(mocks.values).toHaveBeenCalledWith({
      billingMonth: '2026-08',
      currentRequests: kind === 'current' ? 1 : 0,
      rateRequests: 1,
      rateWindowMinute: '2026-08-31T23:59',
      searchRequests: kind === 'search' ? 1 : 0,
    })
    expect(mocks.onConflictDoUpdate).toHaveBeenCalledWith(
      expect.objectContaining({set: expect.any(Object), setWhere: expect.any(Object)}),
    )
    expect(mocks.returning).toHaveBeenCalledOnce()
  },
)

it('should atomically reset or increment the shared UTC-minute provider budget', async () => {
  const mocks = createDatabase([{billingMonth: '2026-08'}])

  await reserveOpenWeatherRequest('current', new Date('2026-08-31T23:59:59.000Z'), mocks.database)

  const conflict = mocks.onConflictDoUpdate.mock.calls[0]?.[0] as {
    readonly set: {readonly rateRequests: SQL}
    readonly setWhere: SQL
  }
  const rateUpdate = compile(conflict.set.rateRequests)
  const reservationCondition = compile(conflict.setWhere)

  expect(rateUpdate.sql).toContain('when "weather_provider_usage"."rate_window_minute" = $1')
  expect(rateUpdate.sql).toContain('then "weather_provider_usage"."rate_requests" + 1')
  expect(rateUpdate.params).toEqual(['2026-08-31T23:59'])
  expect(reservationCondition.sql).toContain('"weather_provider_usage"."rate_window_minute" <> $3')
  expect(reservationCondition.sql).toContain('"weather_provider_usage"."rate_requests" < $4')
  expect(reservationCondition.params).toEqual([
    OPENWEATHER_MONTHLY_REQUEST_LIMIT,
    OPENWEATHER_MONTHLY_CURRENT_LIMIT,
    '2026-08-31T23:59',
    OPENWEATHER_PER_MINUTE_REQUEST_LIMIT,
  ])
})

it('should stop before calling OpenWeather when no monthly reservation is available', async () => {
  const mocks = createDatabase([])

  await expect(
    reserveOpenWeatherRequest('search', new Date('2026-09-01T00:00:00.000Z'), mocks.database),
  ).rejects.toMatchObject({kind: 'search', name: 'OpenWeatherQuotaError'})
})

it('should leave headroom below the free provider allowance', () => {
  expect(OPENWEATHER_MONTHLY_REQUEST_LIMIT).toBe(90_000)
  expect(OPENWEATHER_MONTHLY_CURRENT_LIMIT + OPENWEATHER_MONTHLY_SEARCH_LIMIT).toBe(
    OPENWEATHER_MONTHLY_REQUEST_LIMIT,
  )
  expect(OPENWEATHER_PER_MINUTE_REQUEST_LIMIT * 2).toBeLessThanOrEqual(60)
})
