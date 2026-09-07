import 'server-only'

import {type WeatherFeed, type WeatherLocationId} from 'src/features/weather'
import {type Database, getDatabase, withTransactionalDatabase} from '../database'
import {fetchOpenWeatherCurrent} from './openweather-client'
import {
  createCurrentWeather,
  getLatestWeather,
  getWeatherCollectionState,
  lockWeatherCollection,
  ownsWeatherCollectionLease,
  recordWeatherCollectionFailure,
  resetWeatherCollectionFailure,
  saveWeather,
  setWeatherCollectionLease,
  type WeatherCollectionLease,
  type WeatherTransaction,
} from './repository'
import {getPublicWeatherLocation, type WorldWeatherLocation} from './world-locations'
import {reserveOpenWeatherRequest} from './provider-quota'

const WORLD_WEATHER_REFRESH_MINUTES = 30
const MILLISECONDS_PER_MINUTE = 60_000
export const WORLD_WEATHER_REFRESH_MILLISECONDS =
  WORLD_WEATHER_REFRESH_MINUTES * MILLISECONDS_PER_MINUTE
const COLLECTION_LEASE_MILLISECONDS = 15_000
const COLLECTION_POLL_MILLISECONDS = 2_000

interface WorldWeatherFeedCurrentState {
  readonly feed: WeatherFeed
  readonly status: 'current'
}

interface WorldWeatherFeedMissingState {
  readonly status: 'missing'
}

interface WorldWeatherFeedOutdatedState {
  readonly feed: WeatherFeed
  readonly status: 'outdated'
}

export type WorldWeatherFeedState =
  | WorldWeatherFeedCurrentState
  | WorldWeatherFeedMissingState
  | WorldWeatherFeedOutdatedState

interface CompletedWorldWeatherIngestionResult {
  readonly status: 'completed'
}

interface CurrentWorldWeatherIngestionResult {
  readonly status: 'current'
}

interface RetryWorldWeatherIngestionResult {
  readonly retryAfter: Date
  readonly status: 'collecting' | 'cooldown'
}

interface FailedWorldWeatherIngestionResult {
  readonly error: unknown
  readonly retryAfter: Date
  readonly status: 'failed'
}

export type WorldWeatherIngestionResult =
  | CompletedWorldWeatherIngestionResult
  | CurrentWorldWeatherIngestionResult
  | FailedWorldWeatherIngestionResult
  | RetryWorldWeatherIngestionResult

interface AcquiredWorldWeatherCollection {
  readonly lease: WeatherCollectionLease
  readonly status: 'acquired'
}

type WorldWeatherCollectionClaim =
  | AcquiredWorldWeatherCollection
  | CurrentWorldWeatherIngestionResult
  | RetryWorldWeatherIngestionResult

const getCurrentCutoff = (now: Date): Date =>
  new Date(now.getTime() - WORLD_WEATHER_REFRESH_MILLISECONDS)

const hasCurrentWorldWeather = async (
  locationId: WeatherLocationId,
  now: Date,
  database: WeatherTransaction,
): Promise<boolean> => {
  const record = await getLatestWeather(locationId, database as unknown as Database)
  return record !== undefined && record.collectedAt.getTime() >= getCurrentCutoff(now).getTime()
}

const claimWorldWeatherCollection = async (
  locationId: WeatherLocationId,
  now: Date,
): Promise<WorldWeatherCollectionClaim> =>
  withTransactionalDatabase((database) =>
    database.transaction(async (transaction) => {
      await lockWeatherCollection(locationId, transaction)

      if (await hasCurrentWorldWeather(locationId, now, transaction)) {
        return {status: 'current'}
      }

      const collectionState = await getWeatherCollectionState(locationId, transaction)
      if (
        collectionState?.retryAfter !== null &&
        collectionState?.retryAfter !== undefined &&
        collectionState.retryAfter.getTime() > now.getTime()
      ) {
        return {retryAfter: collectionState.retryAfter, status: 'cooldown'}
      }

      if (
        collectionState?.leaseExpiresAt !== null &&
        collectionState?.leaseExpiresAt !== undefined &&
        collectionState.leaseExpiresAt.getTime() > now.getTime()
      ) {
        return {
          retryAfter: new Date(
            Math.min(
              now.getTime() + COLLECTION_POLL_MILLISECONDS,
              collectionState.leaseExpiresAt.getTime(),
            ),
          ),
          status: 'collecting',
        }
      }

      const bucket = Math.floor(now.getTime() / WORLD_WEATHER_REFRESH_MILLISECONDS)
      const lease = {
        expiresAt: new Date(now.getTime() + COLLECTION_LEASE_MILLISECONDS),
        key: `openweather-v1|${locationId}|${bucket}`,
        token: crypto.randomUUID(),
      }
      await setWeatherCollectionLease(locationId, lease, now, transaction)
      return {lease, status: 'acquired'}
    }),
  )

const recordWorldWeatherFailure = async (
  locationId: WeatherLocationId,
  lease: WeatherCollectionLease,
  failedAt: Date,
  error: unknown,
): Promise<FailedWorldWeatherIngestionResult | RetryWorldWeatherIngestionResult> =>
  withTransactionalDatabase((database) =>
    database.transaction(async (transaction) => {
      await lockWeatherCollection(locationId, transaction)
      if (!(await ownsWeatherCollectionLease(locationId, lease, transaction))) {
        return {
          retryAfter: new Date(failedAt.getTime() + COLLECTION_POLL_MILLISECONDS),
          status: 'collecting',
        }
      }

      const retryAfter = await recordWeatherCollectionFailure(locationId, failedAt, transaction)
      return {error, retryAfter, status: 'failed'}
    }),
  )

const saveWorldWeather = async (
  locationId: WeatherLocationId,
  lease: WeatherCollectionLease,
  now: Date,
  current: Awaited<ReturnType<typeof fetchOpenWeatherCurrent>>,
): Promise<WorldWeatherIngestionResult> =>
  withTransactionalDatabase((database) =>
    database.transaction(async (transaction) => {
      await lockWeatherCollection(locationId, transaction)
      if (!(await ownsWeatherCollectionLease(locationId, lease, transaction))) {
        return {
          retryAfter: new Date(now.getTime() + COLLECTION_POLL_MILLISECONDS),
          status: 'collecting',
        }
      }

      try {
        await transaction.transaction((savepoint) =>
          saveWeather(
            {
              collectedAt: now,
              humidityPercent: current.humidityPercent,
              location: locationId,
              precipitation: current.precipitation,
              precipitationMillimeters: current.precipitationMillimeters,
              sky: current.sky,
              temperatureCelsius: current.temperatureCelsius,
              weatherAt: current.observedAt,
              windSpeedMetersPerSecond: current.windSpeedMetersPerSecond,
            },
            savepoint,
          ),
        )
      } catch (error) {
        const retryAfter = await recordWeatherCollectionFailure(locationId, now, transaction)
        return {error, retryAfter, status: 'failed'}
      }

      await resetWeatherCollectionFailure(locationId, now, transaction)
      return {status: 'completed'}
    }),
  )

/** Collects one OpenWeather row for a registered fixed coordinate. */
export const ingestWorldWeather = async (
  location: WorldWeatherLocation,
  now = new Date(),
): Promise<WorldWeatherIngestionResult> => {
  const claim = await claimWorldWeatherCollection(location.id, now)
  if (claim.status !== 'acquired') {
    return claim
  }

  try {
    await reserveOpenWeatherRequest('current', now)
    const current = await fetchOpenWeatherCurrent({
      latitude: location.latitude,
      longitude: location.longitude,
    })
    return saveWorldWeather(location.id, claim.lease, now, current)
  } catch (error) {
    return recordWorldWeatherFailure(location.id, claim.lease, now, error)
  }
}

const createWorldWeatherFeed = (
  location: WorldWeatherLocation,
  record: NonNullable<Awaited<ReturnType<typeof getLatestWeather>>>,
  stale: boolean,
): WeatherFeed => ({
  current: createCurrentWeather(record),
  expiresAt: new Date(
    record.collectedAt.getTime() + WORLD_WEATHER_REFRESH_MILLISECONDS,
  ).toISOString(),
  location: getPublicWeatherLocation(location),
  observedAt: record.weatherAt.toISOString(),
  schemaVersion: 2,
  source: {name: 'OpenWeather', url: 'https://openweathermap.org/'},
  stale,
  updatedAt: record.collectedAt.toISOString(),
})

/** Reads cached world weather and reports whether its provider refresh is due. */
export const getWorldWeatherFeedState = async (
  location: WorldWeatherLocation,
  now = new Date(),
  database: Database = getDatabase(),
): Promise<WorldWeatherFeedState> => {
  const record = await getLatestWeather(location.id, database)
  if (record === undefined) {
    return {status: 'missing'}
  }

  const isCurrent = record.collectedAt.getTime() >= getCurrentCutoff(now).getTime()
  const feed = createWorldWeatherFeed(location, record, !isCurrent)
  return {feed, status: isCurrent ? 'current' : 'outdated'}
}
