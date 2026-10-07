import {drainLockedBatches} from '../database/drain-locked-batches'
import {MILLISECONDS_PER_DAY} from 'src/utils/time-units'
import {
  createWeatherCacheMaintenanceRepository,
  type WeatherCacheMaintenanceRepository,
} from '../repositories/weather-cache-maintenance'

const WEATHER_CACHE_RETENTION = MILLISECONDS_PER_DAY
const DELETE_BATCH_SIZE = 500
const MAXIMUM_BATCHES = 20

interface WeatherCacheMaintenanceDependencies {
  readonly now: () => Date
  readonly repository: WeatherCacheMaintenanceRepository
}

export interface WeatherCacheMaintenanceResult {
  readonly complete: boolean
  readonly deleted: number
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

  return drainLockedBatches({
    batchSize: DELETE_BATCH_SIZE,
    deleteBatch: () =>
      resolvedDependencies.repository.deleteWeatherBatch({batchSize: DELETE_BATCH_SIZE, cutoff}),
    invalidCountMessage: 'Weather cache maintenance repository returned an invalid batch count',
    maximumBatches: MAXIMUM_BATCHES,
  })
}
