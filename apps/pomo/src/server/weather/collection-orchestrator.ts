import {withTransactionalDatabase} from '../database'
import {
  getWeatherCollectionState,
  lockWeatherCollection,
  ownsWeatherCollectionLease,
  recordWeatherCollectionFailure,
  resetWeatherCollectionFailure,
  saveWeather,
  setWeatherCollectionLease,
  type WeatherCollectionLease,
  type WeatherInput,
  type WeatherTransaction,
} from '../repositories/weather'

const COLLECTION_LEASE_MILLISECONDS = 15_000
const COLLECTION_POLL_MILLISECONDS = 2_000

export interface CompletedWeatherCollectionResult {
  readonly status: 'completed'
}

export interface CurrentWeatherCollectionResult {
  readonly status: 'current'
}

export interface RetryWeatherCollectionResult {
  readonly retryAfter: Date
  readonly status: 'collecting' | 'cooldown'
}

export interface FailedWeatherCollectionResult {
  readonly error: unknown
  readonly retryAfter: Date
  readonly status: 'failed'
}

export type WeatherCollectionResult =
  | CompletedWeatherCollectionResult
  | CurrentWeatherCollectionResult
  | FailedWeatherCollectionResult
  | RetryWeatherCollectionResult

export interface ClaimWeatherCollectionLeaseOptions {
  readonly collectionKey: string
  readonly isCurrent: (transaction: WeatherTransaction) => Promise<boolean>
  readonly locationId: string
  readonly now: Date
}

export interface AcquiredWeatherCollection {
  readonly lease: WeatherCollectionLease
  readonly status: 'acquired'
}

export type WeatherCollectionClaim =
  | AcquiredWeatherCollection
  | CurrentWeatherCollectionResult
  | RetryWeatherCollectionResult

export const claimWeatherCollectionLease = async (
  options: ClaimWeatherCollectionLeaseOptions,
): Promise<WeatherCollectionClaim> =>
  withTransactionalDatabase((database) =>
    database.transaction(async (transaction) => {
      await lockWeatherCollection(options.locationId, transaction)

      if (await options.isCurrent(transaction)) {
        return {status: 'current'}
      }

      const collectionState = await getWeatherCollectionState(options.locationId, transaction)

      if (
        collectionState?.retryAfter !== null &&
        collectionState?.retryAfter !== undefined &&
        collectionState.retryAfter.getTime() > options.now.getTime()
      ) {
        return {retryAfter: collectionState.retryAfter, status: 'cooldown'}
      }

      if (
        collectionState?.leaseExpiresAt !== null &&
        collectionState?.leaseExpiresAt !== undefined &&
        collectionState.leaseExpiresAt.getTime() > options.now.getTime()
      ) {
        return {
          retryAfter: getCollectionRetryAfter(options.now, collectionState.leaseExpiresAt),
          status: 'collecting',
        }
      }

      const lease = {
        expiresAt: new Date(options.now.getTime() + COLLECTION_LEASE_MILLISECONDS),
        key: options.collectionKey,
        token: crypto.randomUUID(),
      }
      await setWeatherCollectionLease(options.locationId, lease, options.now, transaction)

      return {lease, status: 'acquired'}
    }),
  )

interface RecordOwnedCollectionFailureOptions {
  readonly error: unknown
  readonly failedAt: Date
  readonly lease: WeatherCollectionLease
  readonly locationId: string
}

export const recordOwnedCollectionFailure = async (
  options: RecordOwnedCollectionFailureOptions,
): Promise<FailedWeatherCollectionResult | RetryWeatherCollectionResult> =>
  withTransactionalDatabase((database) =>
    database.transaction(async (transaction) => {
      await lockWeatherCollection(options.locationId, transaction)

      if (!(await ownsWeatherCollectionLease(options.locationId, options.lease, transaction))) {
        return {
          retryAfter: getCollectionPollTime(options.failedAt),
          status: 'collecting',
        }
      }

      const retryAfter = await recordWeatherCollectionFailure(
        options.locationId,
        options.failedAt,
        transaction,
      )
      return {error: options.error, retryAfter, status: 'failed'}
    }),
  )

interface SaveOwnedWeatherOptions {
  readonly lease: WeatherCollectionLease
  readonly locationId: string
  readonly now: Date
  readonly row: WeatherInput
}

const saveOwnedWeather = async (
  options: SaveOwnedWeatherOptions,
): Promise<WeatherCollectionResult> =>
  withTransactionalDatabase((database) =>
    database.transaction(async (transaction) => {
      await lockWeatherCollection(options.locationId, transaction)

      if (!(await ownsWeatherCollectionLease(options.locationId, options.lease, transaction))) {
        return {
          retryAfter: getCollectionPollTime(options.now),
          status: 'collecting',
        }
      }

      try {
        await transaction.transaction((savepoint) => saveWeather(options.row, savepoint))
      } catch (error) {
        const retryAfter = await recordWeatherCollectionFailure(
          options.locationId,
          options.now,
          transaction,
        )
        return {error, retryAfter, status: 'failed'}
      }

      await resetWeatherCollectionFailure(options.locationId, options.now, transaction)
      return {status: 'completed'}
    }),
  )

interface RunWeatherCollectionOptionsBase extends ClaimWeatherCollectionLeaseOptions {
  readonly collect: () => Promise<WeatherInput>
}

interface RecordSaveFailureOptions extends RunWeatherCollectionOptionsBase {
  readonly saveFailure: 'record'
}

interface PropagateSaveFailureOptions extends RunWeatherCollectionOptionsBase {
  readonly saveFailure: 'propagate'
}

type RunWeatherCollectionOptions = RecordSaveFailureOptions | PropagateSaveFailureOptions

export const runWeatherCollection = async (
  options: RunWeatherCollectionOptions,
): Promise<WeatherCollectionResult> => {
  const claim = await claimWeatherCollectionLease(options)

  if (claim.status !== 'acquired') {
    return claim
  }

  try {
    const row = await options.collect()
    const saveResult = saveOwnedWeather({
      lease: claim.lease,
      locationId: options.locationId,
      now: options.now,
      row,
    })

    switch (options.saveFailure) {
      case 'record':
        return await saveResult
      case 'propagate':
        return saveResult
      default: {
        const exhaustiveSaveFailure: never = options
        return exhaustiveSaveFailure
      }
    }
  } catch (error) {
    return recordOwnedCollectionFailure({
      error,
      failedAt: options.now,
      lease: claim.lease,
      locationId: options.locationId,
    })
  }
}

const getCollectionPollTime = (now: Date): Date =>
  new Date(now.getTime() + COLLECTION_POLL_MILLISECONDS)

const getCollectionRetryAfter = (now: Date, leaseExpiresAt: Date): Date =>
  new Date(Math.min(getCollectionPollTime(now).getTime(), leaseExpiresAt.getTime()))
