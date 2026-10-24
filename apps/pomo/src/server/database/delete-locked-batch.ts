import {sql, type SQL} from 'drizzle-orm'
import type {PgColumn, PgTable} from 'drizzle-orm/pg-core'
import type {Database} from './index'

const BATCH_LOOKAHEAD = 1

export interface DeleteLockedBatchOptions {
  readonly table: PgTable
  readonly id: PgColumn
  readonly where: SQL
  readonly orderBy?: SQL
  readonly batchSize: number
  readonly emptyResultMessage: string
}

export interface BatchDeletionResult {
  readonly deleted: number
  readonly hasMore: boolean
}

interface BatchResultRow extends Record<string, unknown>, BatchDeletionResult {}

/** Deletes a bounded batch using skip-locked candidates and reports whether another candidate exists. */
export const deleteLockedBatch = async (
  database: Database,
  options: DeleteLockedBatchOptions,
): Promise<BatchDeletionResult> => {
  const ordering = options.orderBy === undefined ? sql`` : sql`order by ${options.orderBy}`
  const result = await database.execute<BatchResultRow>(sql`
    with candidates as (
      select ${options.id} as id
      from ${options.table}
      where ${options.where}
      ${ordering}
      limit ${options.batchSize + BATCH_LOOKAHEAD}
      for update skip locked
    ), deletion_candidates as (
      select id from candidates limit ${options.batchSize}
    ), deleted as (
      delete from ${options.table}
      using deletion_candidates
      where ${options.id} = deletion_candidates.id
      returning ${options.id}
    )
    select
      count(*)::integer as "deleted",
      (select count(*) from candidates) > ${options.batchSize} as "hasMore"
    from deleted
  `)
  const [batch] = result.rows
  if (batch === undefined) {
    throw new Error(options.emptyResultMessage)
  }
  return batch
}
