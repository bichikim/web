import type {WeatherCitySlug} from 'src/features/weather'
import {withTransactionalDatabase} from '../database'
import {fetchKmaObservation, fetchKmaSky} from './kma-client'
import {
  getKmaObservationTime,
  getKmaSkyTime,
  getLatestKmaAvailabilityTime,
  parseKmaDateTime,
} from './kma-time'
import {getWeatherLocation} from './locations'
import {
  getWeatherCollectionState,
  hasCurrentWeather,
  lockWeatherCollection,
  ownsWeatherCollectionLease,
  recordWeatherCollectionFailure,
  resetWeatherCollectionFailure,
  saveWeather,
  setWeatherCollectionLease,
  type WeatherCollectionLease,
} from './repository'

const COLLECTION_LEASE_MILLISECONDS = 15_000
const COLLECTION_POLL_MILLISECONDS = 2_000

interface CompletedWeatherIngestionResult {
  readonly status: 'completed'
}

interface CurrentWeatherIngestionResult {
  readonly status: 'current'
}

interface CooldownWeatherIngestionResult {
  readonly retryAfter: Date
  readonly status: 'cooldown'
}

interface CollectingWeatherIngestionResult {
  readonly retryAfter: Date
  readonly status: 'collecting'
}

interface FailedWeatherIngestionResult {
  readonly error: unknown
  readonly retryAfter: Date
  readonly status: 'failed'
}

export type WeatherIngestionResult =
  | CompletedWeatherIngestionResult
  | CollectingWeatherIngestionResult
  | CooldownWeatherIngestionResult
  | CurrentWeatherIngestionResult
  | FailedWeatherIngestionResult

interface AcquiredWeatherCollection {
  readonly lease: WeatherCollectionLease
  readonly status: 'acquired'
}

type WeatherCollectionClaim =
  | AcquiredWeatherCollection
  | CollectingWeatherIngestionResult
  | CooldownWeatherIngestionResult
  | CurrentWeatherIngestionResult

interface WeatherCollectionRequest {
  readonly collectionKey: string
  readonly observationTime: ReturnType<typeof getKmaObservationTime>
  readonly requestLocation: {
    readonly gridX: number
    readonly gridY: number
  }
  readonly requiredCollectedAt: Date
  readonly skyTime: ReturnType<typeof getKmaSkyTime>
  readonly weatherAt: Date
}

const getCollectionRetryAfter = (now: Date, leaseExpiresAt: Date): Date =>
  new Date(Math.min(now.getTime() + COLLECTION_POLL_MILLISECONDS, leaseExpiresAt.getTime()))

const createCollectionRequest = (
  citySlug: WeatherCitySlug,
  now: Date,
): WeatherCollectionRequest => {
  const location = getWeatherLocation(citySlug)
  const requestLocation = {gridX: location.gridX, gridY: location.gridY}
  const observationTime = getKmaObservationTime(now)
  const skyTime = getKmaSkyTime(now)

  return {
    collectionKey: [
      'weather-v1',
      citySlug,
      `observation:${requestLocation.gridX}:${requestLocation.gridY}:${observationTime.date}:${observationTime.time}`,
      `sky:${requestLocation.gridX}:${requestLocation.gridY}:${skyTime.date}:${skyTime.time}`,
    ].join('|'),
    observationTime,
    requestLocation,
    requiredCollectedAt: getLatestKmaAvailabilityTime(now),
    skyTime,
    weatherAt: parseKmaDateTime(observationTime.date, observationTime.time),
  }
}

const claimWeatherCollection = async (
  citySlug: WeatherCitySlug,
  request: WeatherCollectionRequest,
  now: Date,
): Promise<WeatherCollectionClaim> =>
  withTransactionalDatabase((database) =>
    database.transaction(async (transaction) => {
      await lockWeatherCollection(citySlug, transaction)

      if (
        await hasCurrentWeather(
          citySlug,
          request.weatherAt,
          request.requiredCollectedAt,
          transaction,
        )
      ) {
        return {status: 'current'}
      }

      const collectionState = await getWeatherCollectionState(citySlug, transaction)

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
          retryAfter: getCollectionRetryAfter(now, collectionState.leaseExpiresAt),
          status: 'collecting',
        }
      }

      const lease = {
        expiresAt: new Date(now.getTime() + COLLECTION_LEASE_MILLISECONDS),
        key: request.collectionKey,
        token: crypto.randomUUID(),
      }
      await setWeatherCollectionLease(citySlug, lease, now, transaction)

      return {lease, status: 'acquired'}
    }),
  )

const recordCollectionFailure = async (
  citySlug: WeatherCitySlug,
  lease: WeatherCollectionLease,
  failedAt: Date,
  error: unknown,
): Promise<CollectingWeatherIngestionResult | FailedWeatherIngestionResult> =>
  withTransactionalDatabase((database) =>
    database.transaction(async (transaction) => {
      await lockWeatherCollection(citySlug, transaction)

      if (!(await ownsWeatherCollectionLease(citySlug, lease, transaction))) {
        return {
          retryAfter: new Date(failedAt.getTime() + COLLECTION_POLL_MILLISECONDS),
          status: 'collecting',
        }
      }

      const retryAfter = await recordWeatherCollectionFailure(citySlug, failedAt, transaction)
      return {error, retryAfter, status: 'failed'}
    }),
  )

interface SaveCollectedWeatherOptions {
  readonly citySlug: WeatherCitySlug
  readonly lease: WeatherCollectionLease
  readonly now: Date
  readonly observation: Awaited<ReturnType<typeof fetchKmaObservation>>
  readonly sky: Awaited<ReturnType<typeof fetchKmaSky>>
  readonly weatherAt: Date
}

const saveCollectedWeather = async (
  options: SaveCollectedWeatherOptions,
): Promise<WeatherIngestionResult> =>
  withTransactionalDatabase((database) =>
    database.transaction(async (transaction) => {
      await lockWeatherCollection(options.citySlug, transaction)

      if (!(await ownsWeatherCollectionLease(options.citySlug, options.lease, transaction))) {
        return {
          retryAfter: new Date(options.now.getTime() + COLLECTION_POLL_MILLISECONDS),
          status: 'collecting',
        }
      }

      try {
        await transaction.transaction((savepoint) =>
          saveWeather(
            {
              collectedAt: options.now,
              humidityPercent: options.observation.humidityPercent,
              location: options.citySlug,
              precipitation: options.observation.precipitation,
              precipitationMillimeters: options.observation.precipitationMillimeters,
              sky: options.sky,
              temperatureCelsius: options.observation.temperatureCelsius,
              weatherAt: options.weatherAt,
              windSpeedMetersPerSecond: options.observation.windSpeedMetersPerSecond,
            },
            savepoint,
          ),
        )
      } catch (error) {
        const retryAfter = await recordWeatherCollectionFailure(
          options.citySlug,
          options.now,
          transaction,
        )
        return {error, retryAfter, status: 'failed'}
      }

      await resetWeatherCollectionFailure(options.citySlug, options.now, transaction)
      return {status: 'completed'}
    }),
  )

/** Collects one complete domain weather row for the latest available current time. */
export const ingestWeatherCity = async (
  citySlug: WeatherCitySlug,
  now = new Date(),
): Promise<WeatherIngestionResult> => {
  const request = createCollectionRequest(citySlug, now)
  const claim = await claimWeatherCollection(citySlug, request, now)

  if (claim.status !== 'acquired') {
    return claim
  }

  try {
    const [observation, sky] = await Promise.all([
      fetchKmaObservation({
        baseTime: request.observationTime,
        location: request.requestLocation,
      }),
      fetchKmaSky({
        baseTime: request.skyTime,
        location: request.requestLocation,
        targetTime: now,
      }),
    ])

    const result = await saveCollectedWeather({
      citySlug,
      lease: claim.lease,
      now,
      observation,
      sky,
      weatherAt: request.weatherAt,
    })
    return result
  } catch (error) {
    return recordCollectionFailure(citySlug, claim.lease, now, error)
  }
}
