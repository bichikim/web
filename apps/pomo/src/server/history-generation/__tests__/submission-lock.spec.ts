/** @vitest-environment node */
import {expect, it, vi} from 'vitest'
import type {SQL} from 'drizzle-orm'
import {PgDialect} from 'drizzle-orm/pg-core'

const databaseMocks = vi.hoisted(() => ({withTransactionalDatabase: vi.fn()}))

vi.mock('../../database', () => ({
  withTransactionalDatabase: databaseMocks.withTransactionalDatabase,
}))

import {withHistoryGenerationLock} from '../submission-lock'

it('should hold a database advisory lock while the submission operation runs', async () => {
  const execute = vi.fn<(query: SQL) => Promise<undefined>>(async (_query) => undefined)
  const transaction = {execute}
  const operation = vi.fn().mockResolvedValue('completed')
  const database = {
    transaction: vi.fn(async (callback: (value: typeof transaction) => Promise<string>) =>
      callback(transaction),
    ),
  }
  databaseMocks.withTransactionalDatabase.mockImplementationOnce(async (callback) =>
    callback(database),
  )

  await expect(withHistoryGenerationLock('2026-08-14', operation)).resolves.toBe('completed')
  expect(operation).toHaveBeenCalledOnce()
  expect(database.transaction).toHaveBeenCalledOnce()
  expect(execute).toHaveBeenCalledOnce()

  const query = new PgDialect({casing: 'snake_case'}).sqlToQuery(execute.mock.calls[0]?.[0])
  expect(query.sql).toContain('pg_advisory_xact_lock')
  expect(query.params).toEqual(['history-generation', '2026-08-14'])
})
