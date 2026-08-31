import type {SQL} from 'drizzle-orm'
import {PgDialect} from 'drizzle-orm/pg-core'
import {expect, it, vi} from 'vitest'

import type {Database} from '../../database'
import {createAuthMaintenanceRepository} from '../maintenance-repository'

vi.mock('src/env', () => ({env: {}}))

const compile = (statement: SQL) => new PgDialect({casing: 'snake_case'}).sqlToQuery(statement)

it('should generate a bounded concurrent-safe app session delete', async () => {
  const execute = vi.fn().mockResolvedValue({rows: [{deleted: 2, hasMore: false}]})
  const repository = createAuthMaintenanceRepository({execute} as unknown as Database)
  const expiresAtCutoff = new Date('2026-08-23T18:17:00.000Z')
  const revokedAtCutoff = new Date('2026-08-17T18:17:00.000Z')

  await expect(
    repository.deleteAppSessionBatch({batchSize: 500, expiresAtCutoff, revokedAtCutoff}),
  ).resolves.toEqual({deleted: 2, hasMore: false})

  const query = compile(execute.mock.calls[0]?.[0] as SQL)
  expect(query.sql).toContain('where (("pomo_app_sessions"."revoked_at" is null')
  expect(query.sql).toContain('"pomo_app_sessions"."expires_at" <= $1)')
  expect(query.sql).toContain('or "pomo_app_sessions"."revoked_at" <= $2)')
  expect(query.sql).toContain('limit $3\n        for update skip locked')
  expect(query.sql).toContain(
    'deletion_candidates as (\n        select id from candidates limit $4',
  )
  expect(query.sql).toContain('delete from "pomo_app_sessions"\n        using deletion_candidates')
  expect(query.sql).toContain('(select count(*) from candidates) > $5 as "hasMore"')
  expect(query.params).toEqual([
    expiresAtCutoff.toISOString(),
    revokedAtCutoff.toISOString(),
    501,
    500,
    500,
  ])
})

it('should generate one expiry-based account link challenge delete', async () => {
  const execute = vi.fn().mockResolvedValue({rows: [{deleted: 1, hasMore: true}]})
  const repository = createAuthMaintenanceRepository({execute} as unknown as Database)
  const cutoff = new Date('2026-08-24T17:17:00.000Z')

  await expect(
    repository.deleteAccountLinkChallengeBatch({batchSize: 500, cutoff}),
  ).resolves.toEqual({deleted: 1, hasMore: true})

  const query = compile(execute.mock.calls[0]?.[0] as SQL)
  expect(query.sql).toContain('where "pomo_account_link_challenges"."expires_at" <= $1')
  expect(query.sql).not.toContain('consumed_at')
  expect(query.sql).toContain('limit $2\n        for update skip locked')
  expect(query.sql).toContain(
    'deletion_candidates as (\n        select id from candidates limit $3',
  )
  expect(query.sql).toContain(
    'delete from "pomo_account_link_challenges"\n        using deletion_candidates',
  )
  expect(query.sql).toContain('(select count(*) from candidates) > $4 as "hasMore"')
  expect(query.params).toEqual([cutoff.toISOString(), 501, 500, 500])
})

it('should reject a deletion query without a batch result row', async () => {
  const execute = vi.fn().mockResolvedValue({rows: []})
  const repository = createAuthMaintenanceRepository({execute} as unknown as Database)

  await expect(
    repository.deleteAccountLinkChallengeBatch({
      batchSize: 500,
      cutoff: new Date('2026-08-24T17:17:00.000Z'),
    }),
  ).rejects.toThrow('Auth maintenance deletion did not return a batch result')
})
