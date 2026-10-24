import {and, desc, eq, gte, sql} from 'drizzle-orm'

import {
  type Database,
  type TransactionalDatabase,
  weather,
  weatherCollectionState,
} from '../../database'

type WeatherCollectionRecord = typeof weatherCollectionState.$inferSelect
type WeatherRow = typeof weather.$inferInsert
export type WeatherTransaction = Parameters<Parameters<TransactionalDatabase['transaction']>[0]>[0]

const FIRST_RETRY_DELAY_SECONDS = 30
const SECOND_RETRY_DELAY_SECONDS = 60
const LATER_RETRY_DELAY_SECONDS = 300
const MILLISECONDS_PER_SECOND = 1_000

export interface WeatherInput {
  readonly collectedAt: Date
  readonly humidityPercent: number | null
  readonly location: string
  readonly precipitation: WeatherRow['precipitation']
  readonly precipitationMillimeters: number | null
  readonly sky: WeatherRow['sky']
  readonly temperatureCelsius: number | null
  readonly weatherAt: Date
  readonly windSpeedMetersPerSecond: number | null
}

export interface WeatherCollectionLease {
  readonly expiresAt: Date
  readonly key: string
  readonly token: string
}

/** Serializes weather collection for one location across server instances. */
export const lockWeatherCollection = async (
  location: string,
  database: WeatherTransaction,
): Promise<void> => {
  await database.execute(
    sql`select pg_advisory_xact_lock(hashtext('weather'), hashtext(${location}))`,
  )
}

export const hasCurrentWeather = async (
  location: string,
  weatherAt: Date,
  collectedAfter: Date,
  database: WeatherTransaction,
): Promise<boolean> => {
  const [existing] = await database
    .select({id: weather.id})
    .from(weather)
    .where(
      and(
        eq(weather.location, location),
        eq(weather.weatherAt, weatherAt),
        gte(weather.collectedAt, collectedAfter),
      ),
    )
    .limit(1)

  return existing !== undefined
}

export const getWeatherCollectionState = async (
  location: string,
  database: WeatherTransaction,
): Promise<WeatherCollectionRecord | undefined> => {
  const [state] = await database
    .select()
    .from(weatherCollectionState)
    .where(eq(weatherCollectionState.location, location))
    .limit(1)

  return state
}

export const setWeatherCollectionLease = async (
  location: string,
  lease: WeatherCollectionLease,
  attemptedAt: Date,
  database: WeatherTransaction,
): Promise<void> => {
  await database
    .insert(weatherCollectionState)
    .values({
      lastAttemptedAt: attemptedAt,
      leaseExpiresAt: lease.expiresAt,
      leaseKey: lease.key,
      leaseToken: lease.token,
      location,
    })
    .onConflictDoUpdate({
      set: {
        lastAttemptedAt: attemptedAt,
        leaseExpiresAt: lease.expiresAt,
        leaseKey: lease.key,
        leaseToken: lease.token,
      },
      target: weatherCollectionState.location,
    })
}

export const ownsWeatherCollectionLease = async (
  location: string,
  lease: WeatherCollectionLease,
  database: WeatherTransaction,
): Promise<boolean> => {
  const state = await getWeatherCollectionState(location, database)

  return state?.leaseKey === lease.key && state.leaseToken === lease.token
}

const getRetryDelaySeconds = (previousFailures: number): number => {
  if (previousFailures === 0) {
    return FIRST_RETRY_DELAY_SECONDS
  }

  if (previousFailures === 1) {
    return SECOND_RETRY_DELAY_SECONDS
  }

  return LATER_RETRY_DELAY_SECONDS
}

export const recordWeatherCollectionFailure = async (
  location: string,
  failedAt: Date,
  database: WeatherTransaction,
): Promise<Date> => {
  const existing = await getWeatherCollectionState(location, database)
  const consecutiveFailures = (existing?.consecutiveFailures ?? 0) + 1
  const retryAfter = new Date(
    failedAt.getTime() + getRetryDelaySeconds(consecutiveFailures - 1) * MILLISECONDS_PER_SECOND,
  )

  await database
    .insert(weatherCollectionState)
    .values({
      consecutiveFailures,
      lastAttemptedAt: failedAt,
      lastFailedAt: failedAt,
      leaseExpiresAt: null,
      leaseKey: null,
      leaseToken: null,
      location,
      retryAfter,
    })
    .onConflictDoUpdate({
      set: {
        consecutiveFailures,
        lastAttemptedAt: failedAt,
        lastFailedAt: failedAt,
        leaseExpiresAt: null,
        leaseKey: null,
        leaseToken: null,
        retryAfter,
      },
      target: weatherCollectionState.location,
    })

  return retryAfter
}

export const resetWeatherCollectionFailure = async (
  location: string,
  attemptedAt: Date,
  database: WeatherTransaction,
): Promise<void> => {
  await database
    .insert(weatherCollectionState)
    .values({consecutiveFailures: 0, lastAttemptedAt: attemptedAt, location})
    .onConflictDoUpdate({
      set: {
        consecutiveFailures: 0,
        lastAttemptedAt: attemptedAt,
        lastFailedAt: null,
        leaseExpiresAt: null,
        leaseKey: null,
        leaseToken: null,
        retryAfter: null,
      },
      target: weatherCollectionState.location,
    })
}

export const saveWeather = async (
  input: WeatherInput,
  database: WeatherTransaction,
): Promise<void> => {
  await database
    .insert(weather)
    .values(input)
    .onConflictDoUpdate({
      set: {
        collectedAt: input.collectedAt,
        humidityPercent: input.humidityPercent,
        precipitation: input.precipitation,
        precipitationMillimeters: input.precipitationMillimeters,
        sky: input.sky,
        temperatureCelsius: input.temperatureCelsius,
        windSpeedMetersPerSecond: input.windSpeedMetersPerSecond,
      },
      target: [weather.location, weather.weatherAt],
    })
}

export const getLatestWeather = async (location: string, database: Database) => {
  const [record] = await database
    .select()
    .from(weather)
    .where(eq(weather.location, location))
    .orderBy(desc(weather.weatherAt))
    .limit(1)

  return record
}
