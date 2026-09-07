import 'server-only'

import {createWeatherCacheMaintenanceRepository} from './cache-maintenance-repository'

const MILLISECONDS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60
const HOURS_PER_DAY = 24
const WEATHER_CACHE_RETENTION =
  HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND
const DELETE_BATCH_SIZE = 500
const MAXIMUM_BATCHES = 20

interface DeleteWeatherBatchOptions {
  readonly batchSize: number
  readonly cutoff: Date
}

export interface WeatherCacheMaintenanceBatchResult {
  readonly deleted: number
  readonly hasMore: boolean
}

export interface WeatherCacheMaintenanceRepository {
  readonly deleteWeatherBatch: (
    options: DeleteWeatherBatchOptions,
  ) => Promise<WeatherCacheMaintenanceBatchResult>
}

interface WeatherCacheMaintenanceDependencies {
  readonly now: () => Date
  readonly repository: WeatherCacheMaintenanceRepository
}

export interface WeatherCacheMaintenanceResult {
  readonly complete: boolean
  readonly deleted: number
}

const deleteInBatches = async (
  repository: WeatherCacheMaintenanceRepository,
  cutoff: Date,
  batch = 0,
  deleted = 0,
): Promise<WeatherCacheMaintenanceResult> => {
  if (batch === MAXIMUM_BATCHES) {
    return {complete: false, deleted}
  }

  const result = await repository.deleteWeatherBatch({
    batchSize: DELETE_BATCH_SIZE,
    cutoff,
  })

  if (
    result.deleted < 0 ||
    result.deleted > DELETE_BATCH_SIZE ||
    (result.hasMore && result.deleted !== DELETE_BATCH_SIZE)
  ) {
    throw new RangeError('Weather cache maintenance repository returned an invalid batch count')
  }

  const totalDeleted = deleted + result.deleted

  return result.hasMore
    ? deleteInBatches(repository, cutoff, batch + 1, totalDeleted)
    : {complete: true, deleted: totalDeleted}
}

/** Deletes weather observations collected at least 24 hours ago. */
export const runWeatherCacheMaintenance = async (
  dependencies?: WeatherCacheMaintenanceDependencies,
): Promise<WeatherCacheMaintenanceResult> => {
  const resolvedDependencies = dependencies ?? {
    now: () => new Date(),
    repository: createWeatherCacheMaintenanceRepository(),
  }
  const cutoff = new Date(resolvedDependencies.now().getTime() - WEATHER_CACHE_RETENTION)

  return deleteInBatches(resolvedDependencies.repository, cutoff)
}
