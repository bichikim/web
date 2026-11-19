/** @vitest-environment node */
import type {SQL} from 'drizzle-orm'
import {PgDialect} from 'drizzle-orm/pg-core'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import type {Database} from '../../../database'
import {expireGenerationSubmission, listRecoverableGenerationRuns, type RecoveryCutoffs} from '..'

const databaseMocks = vi.hoisted(() => ({getDatabase: vi.fn()}))

vi.mock('src/env', () => ({env: {}}))
vi.mock('../../../database', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../database')>()),
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

const RECOVERY_ROW = {
  id: 'run-1',
  responseId: null,
  status: 'preparing',
  submissionState: 'unknown',
} as const

const createDatabaseProbe = () => {
  const completion = vi.fn(async () => [RECOVERY_ROW])
  const where = vi.fn((_condition: SQL) => ({
    orderBy: vi.fn(() => ({limit: completion})),
    returning: completion,
  }))
  const set = vi.fn(() => ({where}))
  const database = {
    select: vi.fn(() => ({from: vi.fn(() => ({where}))})),
    update: vi.fn(() => ({set})),
  } as unknown as Database
  return {completion, database, set, where}
}

const runOperation = (operation: 'expire' | 'list', cutoffs: RecoveryCutoffs, database: Database) =>
  operation === 'expire'
    ? expireGenerationSubmission(RECOVERY_ROW.id, cutoffs, database)
    : listRecoverableGenerationRuns(cutoffs, database)

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

it('should query recovery candidates and classify the returned rows', async () => {
  const limit = vi.fn(async () => [
    {id: 'run-1', responseId: 'resp-1', status: 'submitted', submissionState: null},
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
  ).resolves.toEqual([{kind: 'response', responseId: 'resp-1'}])
  expect(orderBy).toHaveBeenCalledOnce()
  const condition = where.mock.calls[0]?.[0]
  const query = new PgDialect({casing: 'snake_case'}).sqlToQuery(condition)
  expect(query.params).toContain('preparing')
  expect(query.sql).toContain('"updated_at" <')
})

it('should use the default database for an expiration request', async () => {
  const probe = createDatabaseProbe()
  databaseMocks.getDatabase.mockReturnValue(probe.database)
  await expect(expireGenerationSubmission(RECOVERY_ROW.id, RECOVERY_CUTOFFS)).resolves.toBe(true)
  expect(databaseMocks.getDatabase).toHaveBeenCalledExactlyOnceWith()
})

describe.each(['expire', 'list'] as const)('%s cutoff contract', (operation) => {
  it('should preserve cutoff reads and SQL parameter order', async () => {
    const reads: Array<keyof RecoveryCutoffs> = []
    const cutoffs: RecoveryCutoffs = {
      get preparingBefore() {
        reads.push('preparingBefore')
        return RECOVERY_CUTOFFS.preparingBefore
      },
      get submissionExpiredBefore() {
        reads.push('submissionExpiredBefore')
        return RECOVERY_CUTOFFS.submissionExpiredBefore
      },
      get submittedBefore() {
        reads.push('submittedBefore')
        return RECOVERY_CUTOFFS.submittedBefore
      },
    }
    const probe = createDatabaseProbe()
    await runOperation(operation, cutoffs, probe.database)

    expect(reads).toEqual([
      ...(operation === 'list' ? ['submittedBefore'] : []),
      'submissionExpiredBefore',
      'preparingBefore',
    ])
    const condition = probe.where.mock.calls[0]?.[0]
    const query = new PgDialect({casing: 'snake_case'}).sqlToQuery(condition)
    expect(query.params).toEqual([
      ...(operation === 'expire'
        ? [RECOVERY_ROW.id]
        : ['submitted', RECOVERY_CUTOFFS.submittedBefore.toISOString()]),
      'preparing',
      'unknown',
      RECOVERY_CUTOFFS.submissionExpiredBefore.toISOString(),
      RECOVERY_CUTOFFS.preparingBefore.toISOString(),
    ])
  })

  it.each(['submissionExpiredBefore', 'preparingBefore'] as const)(
    'should retain a %s getter failure before sending the query',
    async (failedCutoff) => {
      const failure = new Error('cutoff access failed')
      const reads: Array<keyof RecoveryCutoffs> = []
      const read = (name: keyof RecoveryCutoffs) => {
        reads.push(name)
        if (name === failedCutoff) {
          throw failure
        }
        return RECOVERY_CUTOFFS[name]
      }
      const cutoffs: RecoveryCutoffs = {
        get preparingBefore() {
          return read('preparingBefore')
        },
        get submissionExpiredBefore() {
          return read('submissionExpiredBefore')
        },
        get submittedBefore() {
          return read('submittedBefore')
        },
      }
      const probe = createDatabaseProbe()
      await expect(runOperation(operation, cutoffs, probe.database)).rejects.toBe(failure)
      expect(reads).toEqual([
        ...(operation === 'list' ? ['submittedBefore'] : []),
        'submissionExpiredBefore',
        ...(failedCutoff === 'preparingBefore' ? ['preparingBefore'] : []),
      ])
      expect(probe.where).not.toHaveBeenCalled()
      expect(probe.completion).not.toHaveBeenCalled()
    },
  )

  it('should propagate the database failure unchanged', async () => {
    const probe = createDatabaseProbe()
    const failure = new Error('database failed')
    probe.completion.mockRejectedValueOnce(failure)
    await expect(runOperation(operation, RECOVERY_CUTOFFS, probe.database)).rejects.toBe(failure)
  })

  it('should wait for the database result before reporting completion', async () => {
    const probe = createDatabaseProbe()
    const started = Promise.withResolvers<void>()
    const pending = Promise.withResolvers<Array<typeof RECOVERY_ROW>>()
    probe.completion.mockImplementationOnce(() => {
      started.resolve()
      return pending.promise
    })
    let settled = false
    const result = runOperation(operation, RECOVERY_CUTOFFS, probe.database).finally(() => {
      settled = true
    })
    await started.promise
    expect(settled).toBe(false)
    pending.resolve([RECOVERY_ROW])
    await expect(result).resolves.toEqual(
      operation === 'expire' ? true : [{kind: 'submission_unknown', runId: RECOVERY_ROW.id}],
    )
  })
})
