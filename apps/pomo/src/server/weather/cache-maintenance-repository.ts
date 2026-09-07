import 'server-only'

import {lte, sql, type SQL} from 'drizzle-orm'

import {type Database, getDatabase, weather} from '../database'
import type {
  WeatherCacheMaintenanceBatchResult,
  WeatherCacheMaintenanceRepository,
} from './cache-maintenance'

const BATCH_LOOKAHEAD = 1

interface BatchResultRow extends Record<string, unknown> {
  readonly deleted: number
  readonly hasMore: boolean
}

const getBatchResult = (
  rows: ReadonlyArray<BatchResultRow>,
): WeatherCacheMaintenanceBatchResult => {
  const [result] = rows

  if (result === undefined) {
    throw new Error('Weather cache deletion did not return a batch result')
  }

  return result
}

const createDeleteStatement = (batchSize: number, cutoff: Date): SQL => sql`
  with candidates as (
    select ${weather.id}
    from ${weather}
    where ${lte(weather.collectedAt, cutoff)}
    order by ${weather.collectedAt}, ${weather.id}
    limit ${batchSize + BATCH_LOOKAHEAD}
    for update skip locked
  ), deletion_candidates as (
    select id from candidates limit ${batchSize}
  ), deleted as (
    delete from ${weather}
    using deletion_candidates
    where ${weather.id} = deletion_candidates.id
    returning ${weather.id}
  )
  select
    count(*)::integer as "deleted",
    (select count(*) from candidates) > ${batchSize} as "hasMore"
  from deleted
`

/** Creates the PostgreSQL adapter used by weather cache maintenance. */
export const createWeatherCacheMaintenanceRepository = (
  database: Database = getDatabase(),
): WeatherCacheMaintenanceRepository => ({
  async deleteWeatherBatch(options) {
    const result = await database.execute<BatchResultRow>(
      createDeleteStatement(options.batchSize, options.cutoff),
    )

    return getBatchResult(result.rows)
  },
})
