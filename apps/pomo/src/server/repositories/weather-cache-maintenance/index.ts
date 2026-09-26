import {deleteLockedBatch} from '../../database/delete-locked-batch'
import {lte, sql} from 'drizzle-orm'

import {type Database, getDatabase, weather} from '../../database'

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

/** Creates the PostgreSQL adapter used by weather cache maintenance. */
export const createWeatherCacheMaintenanceRepository = (
  database: Database = getDatabase(),
): WeatherCacheMaintenanceRepository => ({
  deleteWeatherBatch(options) {
    return deleteLockedBatch(database, {
      batchSize: options.batchSize,
      emptyResultMessage: 'Weather cache deletion did not return a batch result',
      id: weather.id,
      orderBy: sql`${weather.collectedAt}, ${weather.id}`,
      table: weather,
      where: lte(weather.collectedAt, options.cutoff),
    })
  },
})
