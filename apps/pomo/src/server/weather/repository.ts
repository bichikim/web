import {and, desc, eq, gte, sql} from 'drizzle-orm'

import {
  type LegacyWeatherFeed,
  resolveWeatherCondition,
  type WeatherCitySlug,
  type WeatherPrecipitation,
  type WeatherSky,
} from 'src/features/weather'
import {
  type Database,
  getDatabase,
  type TransactionalDatabase,
  weather,
  weatherCollectionState,
} from '../database'
import {
  getKmaObservationTime,
  getLatestKmaAvailabilityTime,
  getSecondsUntilNextKmaAvailability,
  parseKmaDateTime,
} from './kma-time'
import {getWeatherLocation} from './locations'

const MILLISECONDS_PER_SECOND = 1_000

type WeatherRecord = typeof weather.$inferSelect
type WeatherCollectionRecord = typeof weatherCollectionState.$inferSelect
export type WeatherTransaction = Parameters<Parameters<TransactionalDatabase['transaction']>[0]>[0]

const FIRST_RETRY_DELAY_SECONDS = 30
const SECOND_RETRY_DELAY_SECONDS = 60
const LATER_RETRY_DELAY_SECONDS = 300

interface CurrentWeatherFeedState {
  readonly feed: LegacyWeatherFeed
  readonly status: 'current'
}

interface MissingWeatherFeedState {
  readonly status: 'missing'
}

interface OutdatedWeatherFeedState {
  readonly feed: LegacyWeatherFeed
  readonly status: 'outdated'
}

export type WeatherFeedState =
  | CurrentWeatherFeedState
  | MissingWeatherFeedState
  | OutdatedWeatherFeedState

export interface WeatherInput {
  readonly collectedAt: Date
  readonly humidityPercent: number | null
  readonly location: string
  readonly precipitation: WeatherPrecipitation
  readonly precipitationMillimeters: number | null
  readonly sky: WeatherSky | null
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

export const createCurrentWeather = (record: WeatherRecord): LegacyWeatherFeed['current'] => ({
  condition: resolveWeatherCondition({precipitation: record.precipitation, sky: record.sky}),
  humidityPercent: record.humidityPercent,
  precipitationMillimeters: record.precipitationMillimeters,
  temperatureCelsius: record.temperatureCelsius,
})

interface CreateWeatherFeedOptions {
  readonly location: WeatherCitySlug
  readonly now: Date
  readonly record: WeatherRecord
  readonly stale: boolean
}

const createWeatherFeed = (options: CreateWeatherFeedOptions): LegacyWeatherFeed => {
  const expiresAt = new Date(
    options.now.getTime() +
      getSecondsUntilNextKmaAvailability(options.now) * MILLISECONDS_PER_SECOND,
  )
  const location = getWeatherLocation(options.location)

  return {
    city: {label: location.label, slug: location.slug},
    current: createCurrentWeather(options.record),
    expiresAt: expiresAt.toISOString(),
    observedAt: options.record.weatherAt.toISOString(),
    schemaVersion: 1,
    source: {
      name: '기상청',
      url: 'https://www.data.go.kr/data/15084084/openapi.do',
    },
    stale: options.stale,
    updatedAt: options.record.collectedAt.toISOString(),
  }
}

const isWeatherCurrent = (record: WeatherRecord, now: Date): boolean => {
  const observationTime = getKmaObservationTime(now)
  const requiredWeatherAt = parseKmaDateTime(observationTime.date, observationTime.time)

  const requiredCollectedAt = getLatestKmaAvailabilityTime(now)

  return (
    record.weatherAt.getTime() >= requiredWeatherAt.getTime() &&
    record.collectedAt.getTime() >= requiredCollectedAt.getTime()
  )
}

export const getWeatherFeedState = async (
  location: WeatherCitySlug,
  now = new Date(),
  database: Database = getDatabase(),
): Promise<WeatherFeedState> => {
  const record = await getLatestWeather(location, database)

  if (record === undefined) {
    return {status: 'missing'}
  }

  const isCurrent = isWeatherCurrent(record, now)
  const feed = createWeatherFeed({location, now, record, stale: !isCurrent})

  return {feed, status: isCurrent ? 'current' : 'outdated'}
}
