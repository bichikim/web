import type {SQL} from 'drizzle-orm'
import {PgDialect} from 'drizzle-orm/pg-core'
import {beforeEach, expect, it, vi} from 'vitest'

import type {Database} from '../../database'
import {
  expireGenerationSubmission,
  listRecoverableGenerationRuns,
} from '../generation-recovery-repository'

const databaseMocks = vi.hoisted(() => ({getDatabase: vi.fn()}))

vi.mock('src/env', () => ({env: {}}))
vi.mock('../../database', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../database')>()),
  getDatabase: databaseMocks.getDatabase,
}))

beforeEach(() => {
  databaseMocks.getDatabase.mockReset()
})

const RECOVERY_CUTOFFS = {
  preparingBefore: new Date('2026-08-15T00:00:00.000Z'),
  submissionExpiredBefore: new Date('2026-08-15T00:30:00.000Z'),
  submittedBefore: new Date('2026-08-15T00:00:00.000Z'),
}

it('should expire only an ambiguous submission past its recovery deadline', async () => {
  const returning = vi.fn(async () => [{id: 'run-1'}])
  const where = vi.fn((_condition: SQL) => ({returning}))
  const set = vi.fn(() => ({where}))
  const database = {
    update: vi.fn(() => ({set})),
  } as unknown as Database
  await expect(expireGenerationSubmission('run-1', RECOVERY_CUTOFFS, database)).resolves.toBe(true)

  expect(set).toHaveBeenCalledWith(expect.objectContaining({submissionState: 'expired'}))
  const condition = where.mock.calls[0]?.[0]
  const query = new PgDialect({casing: 'snake_case'}).sqlToQuery(condition)
  expect(query.params).toEqual([
    'run-1',
    'preparing',
    'unknown',
    RECOVERY_CUTOFFS.submissionExpiredBefore.toISOString(),
    RECOVERY_CUTOFFS.preparingBefore.toISOString(),
  ])
  expect(query.sql).toContain('"open_ai_response_id" is null')
  expect(query.sql).toContain('"submission_expires_at" <= $4')
  expect(query.sql).toContain('"updated_at" < $5')
})

it('should report when an ambiguous submission lost the expiration race', async () => {
  const database = {
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({returning: vi.fn(async () => [])})),
      })),
    })),
  } as unknown as Database

  await expect(expireGenerationSubmission('run-1', RECOVERY_CUTOFFS, database)).resolves.toBe(false)
})

it('should list submitted responses and expired ambiguous submissions', async () => {
  const limit = vi.fn(async () => [
    {id: 'run-preparing', responseId: null, status: 'preparing', submissionState: null},
    {id: 'run-unknown', responseId: null, status: 'preparing', submissionState: 'unknown'},
    {id: 'run-missing', responseId: null, status: 'submitted', submissionState: null},
    {id: 'run-1', responseId: 'resp-1', status: 'submitted', submissionState: null},
    {id: 'run-2', responseId: 'resp-2', status: 'submitted', submissionState: null},
  ])
  const orderBy = vi.fn(() => ({limit}))
  const where = vi.fn((_condition: SQL) => ({orderBy}))
  const database = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where,
      })),
    })),
  } as unknown as Database
  databaseMocks.getDatabase.mockReturnValue(database)

  await expect(
    listRecoverableGenerationRuns({
      preparingBefore: new Date('2026-08-16T00:00:00.000Z'),
      submissionExpiredBefore: new Date('2026-08-16T00:30:00.000Z'),
      submittedBefore: new Date('2026-08-16T00:00:00.000Z'),
    }),
  ).resolves.toEqual([
    {kind: 'submission_unknown', runId: 'run-preparing'},
    {kind: 'submission_unknown', runId: 'run-unknown'},
    {kind: 'response', responseId: 'resp-1'},
    {kind: 'response', responseId: 'resp-2'},
  ])
  expect(orderBy).toHaveBeenCalledOnce()
  const condition = where.mock.calls[0]?.[0]
  const query = new PgDialect({casing: 'snake_case'}).sqlToQuery(condition)
  expect(query.params).toContain('preparing')
  expect(query.sql).toContain('"updated_at" <')
})
