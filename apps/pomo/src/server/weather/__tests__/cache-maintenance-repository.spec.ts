import type {SQL} from 'drizzle-orm'
import {PgDialect} from 'drizzle-orm/pg-core'
import {expect, it, vi} from 'vitest'

vi.mock('src/env', () => ({
  env: {},
}))

import type {Database} from '../../database'
import {createWeatherCacheMaintenanceRepository} from '../cache-maintenance-repository'

const compile = (statement: SQL) => new PgDialect({casing: 'snake_case'}).sqlToQuery(statement)

it('should generate a bounded concurrent-safe weather cache delete', async () => {
  const execute = vi.fn().mockResolvedValue({rows: [{deleted: 2, hasMore: false}]})
  const repository = createWeatherCacheMaintenanceRepository({execute} as unknown as Database)
  const cutoff = new Date('2026-08-29T18:57:00.000Z')

  await expect(repository.deleteWeatherBatch({batchSize: 500, cutoff})).resolves.toEqual({
    deleted: 2,
    hasMore: false,
  })

  const query = compile(execute.mock.calls[0]?.[0] as SQL)
  expect(query.sql).toContain('where "weather"."collected_at" <= $1')
  expect(query.sql).toContain('order by "weather"."collected_at", "weather"."id"')
  expect(query.sql).toContain('limit $2\n    for update skip locked')
  expect(query.sql).toContain('deletion_candidates as (\n    select id from candidates limit $3')
  expect(query.sql).toContain('delete from "weather"\n    using deletion_candidates')
  expect(query.sql).toContain('(select count(*) from candidates) > $4 as "hasMore"')
  expect(query.params).toEqual([cutoff.toISOString(), 501, 500, 500])
})

it('should reject a deletion query without a batch result row', async () => {
  const execute = vi.fn().mockResolvedValue({rows: []})
  const repository = createWeatherCacheMaintenanceRepository({execute} as unknown as Database)

  await expect(
    repository.deleteWeatherBatch({
      batchSize: 500,
      cutoff: new Date('2026-08-29T18:57:00.000Z'),
    }),
  ).rejects.toThrow('Weather cache deletion did not return a batch result')
})
