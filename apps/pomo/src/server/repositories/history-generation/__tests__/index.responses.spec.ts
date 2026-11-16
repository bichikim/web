/** @vitest-environment node */
import {beforeEach, describe, expect, it, vi} from 'vitest'
import type {SQL} from 'drizzle-orm'
import {PgDialect} from 'drizzle-orm/pg-core'
import type {Database, TransactionalDatabase} from '../../../database'

import {
  associateGenerationResponse,
  asTransactionalDatabase,
  createClaimProbe,
  createResponseTransaction,
  createRun,
  failHistoryResponse,
  findGenerationRun,
  GENERATION,
  markGenerationSubmitted,
  publishHistoryResponse,
  rejectHistoryResponse,
  RESPONSE_ID,
  RUN_ID,
  SOURCE_URLS,
} from './index.test-support'

const databaseMocks = vi.hoisted(() => ({
  getDatabase: vi.fn(),
  withTransactionalDatabase: vi.fn(),
}))

vi.mock('src/env', () => ({env: {}}))
vi.mock('../../../database', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../database')>()),
  getDatabase: databaseMocks.getDatabase,
  withTransactionalDatabase: databaseMocks.withTransactionalDatabase,
}))

beforeEach(() => {
  databaseMocks.getDatabase.mockReset()
  databaseMocks.withTransactionalDatabase.mockReset()
})

it('should accept the first response persistence acknowledgement', async () => {
  const returning = vi.fn(async () => [{responseId: RESPONSE_ID}])
  const where = vi.fn((_condition: SQL) => ({returning}))
  const database = {
    update: vi.fn(() => ({
      set: vi.fn(() => ({where})),
    })),
  } as unknown as Database

  await expect(
    markGenerationSubmitted(RUN_ID, 'submission-key', RESPONSE_ID, database),
  ).resolves.toBeUndefined()

  const condition = where.mock.calls[0]?.[0]
  const query = new PgDialect({casing: 'snake_case'}).sqlToQuery(condition)
  expect(query.sql).toContain('"open_ai_submission_key" = $3')
  expect(query.params).toEqual([RUN_ID, 'preparing', 'submission-key'])
})

it('should find present and absent generation runs through the default database', async () => {
  const select = vi
    .fn()
    .mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => ({limit: vi.fn(async () => [createRun('submitted')])})),
      })),
    })
    .mockReturnValueOnce({
      from: vi.fn(() => ({where: vi.fn(() => ({limit: vi.fn(async () => [])}))})),
    })
  databaseMocks.getDatabase.mockReturnValue({select} as unknown as Database)

  await expect(findGenerationRun(RESPONSE_ID)).resolves.toMatchObject({id: RUN_ID})
  await expect(findGenerationRun('missing')).resolves.toBeUndefined()
})

it('should fall back to finding a response when association loses a race', async () => {
  const select = vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({limit: vi.fn(async () => [createRun('submitted')])})),
    })),
  }))
  const database = {
    select,
    update: vi.fn(() => ({
      set: vi.fn(() => ({where: vi.fn(() => ({returning: vi.fn(async () => [])}))})),
    })),
  } as unknown as Database

  await expect(
    associateGenerationResponse(RESPONSE_ID, RUN_ID, 'submission-key', database),
  ).resolves.toMatchObject({openAiResponseId: RESPONSE_ID})
})

it('should ignore a duplicate publish event and reject a missing run', async () => {
  const duplicate = createResponseTransaction(createRun('submitted'), {claimed: false})
  await expect(
    publishHistoryResponse(
      {
        eventId: 'evt-1',
        generation: GENERATION,
        model: 'gpt-5',
        replaceDate: false,
        responseId: RESPONSE_ID,
        searchSourceUrls: SOURCE_URLS,
      },
      asTransactionalDatabase(duplicate.transaction),
    ),
  ).resolves.toBe(false)

  const missing = createResponseTransaction(undefined)
  await expect(
    publishHistoryResponse(
      {
        eventId: 'evt-2',
        generation: GENERATION,
        model: 'gpt-5',
        replaceDate: false,
        responseId: RESPONSE_ID,
        searchSourceUrls: SOURCE_URLS,
      },
      asTransactionalDatabase(missing.transaction),
    ),
  ).rejects.toThrow('Generation run not found for response')
})

it('should publish generated moments and replace same-date history', async () => {
  const response = createResponseTransaction(createRun('submitted'))
  const database = asTransactionalDatabase(response.transaction)

  await expect(
    publishHistoryResponse(
      {
        eventId: 'evt-1',
        generation: GENERATION,
        model: 'gpt-5',
        replaceDate: true,
        responseId: RESPONSE_ID,
        searchSourceUrls: SOURCE_URLS,
      },
      database,
    ),
  ).resolves.toBe(true)
  expect(response.momentValues).toHaveBeenCalledTimes(3)
  expect(response.sourceValues).toHaveBeenCalledTimes(3)
  expect(response.update).toHaveBeenCalledTimes(2)
})

it('should publish through the default transaction wrapper without replacing the date', async () => {
  const response = createResponseTransaction(createRun('submitted'))
  const database = asTransactionalDatabase(response.transaction)
  databaseMocks.withTransactionalDatabase.mockImplementationOnce((callback) => callback(database))

  await expect(
    publishHistoryResponse({
      eventId: 'evt-1',
      generation: GENERATION,
      model: 'gpt-5',
      replaceDate: false,
      responseId: RESPONSE_ID,
      searchSourceUrls: SOURCE_URLS,
    }),
  ).resolves.toBe(true)
})

it('should reject replacement without moments and failed moment persistence', async () => {
  const empty = createResponseTransaction(createRun('submitted'))
  await expect(
    publishHistoryResponse(
      {
        eventId: 'evt-empty',
        generation: {moments: []},
        model: 'gpt-5',
        replaceDate: true,
        responseId: RESPONSE_ID,
        searchSourceUrls: [],
      },
      asTransactionalDatabase(empty.transaction),
    ),
  ).rejects.toThrow('A generation must contain at least one historical moment')

  const failed = createResponseTransaction(createRun('submitted'), {storeMoment: false})
  await expect(
    publishHistoryResponse(
      {
        eventId: 'evt-failed',
        generation: {moments: [GENERATION.moments[0]]},
        model: 'gpt-5',
        replaceDate: false,
        responseId: RESPONSE_ID,
        searchSourceUrls: SOURCE_URLS,
      },
      asTransactionalDatabase(failed.transaction),
    ),
  ).rejects.toThrow('Failed to persist a generated historical moment')
})

it('should handle duplicate, missing, successful, and default terminal events', async () => {
  const duplicate = createResponseTransaction(createRun('submitted'), {claimed: false})
  await expect(
    failHistoryResponse(
      'evt-duplicate',
      RESPONSE_ID,
      'failed',
      asTransactionalDatabase(duplicate.transaction),
    ),
  ).resolves.toBe(false)

  const missing = createResponseTransaction(undefined)
  await expect(
    failHistoryResponse(
      'evt-missing',
      RESPONSE_ID,
      'failed',
      asTransactionalDatabase(missing.transaction),
    ),
  ).rejects.toThrow('Generation run not found for response')

  const failed = createResponseTransaction(createRun('submitted'))
  await expect(
    failHistoryResponse(
      'evt-failed',
      RESPONSE_ID,
      'failed',
      asTransactionalDatabase(failed.transaction),
    ),
  ).resolves.toBe(true)

  const rejected = createResponseTransaction(createRun('submitted'))
  const rejectedDatabase = asTransactionalDatabase(rejected.transaction)
  databaseMocks.withTransactionalDatabase.mockImplementationOnce((callback) =>
    callback(rejectedDatabase),
  )
  await expect(rejectHistoryResponse('evt-rejected', RESPONSE_ID, 'rejected')).resolves.toBe(true)
})

const publishOptions = {
  eventId: 'evt-claim',
  generation: GENERATION,
  model: 'gpt-5',
  replaceDate: false,
  responseId: RESPONSE_ID,
  searchSourceUrls: SOURCE_URLS,
} as const

interface ResponseFlow {
  readonly name: string
  readonly invoke: (database: TransactionalDatabase) => Promise<boolean>
}

const responseFlows: ReadonlyArray<ResponseFlow> = [
  {invoke: (database) => publishHistoryResponse(publishOptions, database), name: 'publish'},
  {
    invoke: (database) => failHistoryResponse('evt-claim', RESPONSE_ID, 'failed', database),
    name: 'failure',
  },
  {
    invoke: (database) => rejectHistoryResponse('evt-claim', RESPONSE_ID, 'rejected', database),
    name: 'rejection',
  },
]

describe.each(responseFlows)('$name response acceptance', ({invoke}) => {
  it('should stop before a run lookup when the event is already claimed', async () => {
    const response = createResponseTransaction(createRun('submitted'), {claimed: false})
    await expect(invoke(asTransactionalDatabase(response.transaction))).resolves.toBe(false)
    expect(response.transaction.select).not.toHaveBeenCalled()
    expect(response.update).not.toHaveBeenCalled()
    expect(response.momentValues).not.toHaveBeenCalled()
  })

  it('should reject a claimed event with no matching run', async () => {
    const response = createResponseTransaction(undefined)
    await expect(invoke(asTransactionalDatabase(response.transaction))).rejects.toThrow(
      `Generation run not found for response: ${RESPONSE_ID}`,
    )
    expect(response.update).not.toHaveBeenCalled()
    expect(response.momentValues).not.toHaveBeenCalled()
  })

  it.each(['preparing', 'completed', 'failed', 'rejected'] as const)(
    'should keep a %s run unchanged after claiming the event',
    async (status) => {
      const response = createResponseTransaction(createRun(status))
      await expect(invoke(asTransactionalDatabase(response.transaction))).resolves.toBe(false)
      expect(response.transaction.select).toHaveBeenCalledOnce()
      expect(response.update).not.toHaveBeenCalled()
      expect(response.momentValues).not.toHaveBeenCalled()
    },
  )

  it.each(['claim', 'lookup'] as const)(
    'should propagate the original %s failure without writing a result',
    async (phase) => {
      const probe = createClaimProbe()
      const failure = new Error(`${phase} unavailable`)
      const outcome = Promise.allSettled([invoke(probe.database)])
      await probe.claimStarted.promise
      if (phase === 'claim') {
        probe.claim.reject(failure)
      } else {
        probe.claim.resolve([{eventId: 'evt-claim'}])
        await probe.lookupStarted.promise
        probe.lookup.reject(failure)
      }

      const [result] = await outcome
      expect(result.status).toBe('rejected')
      if (result.status === 'rejected') {
        expect(result.reason).toBe(failure)
      }
      expect(probe.update).not.toHaveBeenCalled()
      expect(probe.momentValues).not.toHaveBeenCalled()
      expect(probe.transaction.select).toHaveBeenCalledTimes(phase === 'claim' ? 0 : 1)
    },
  )

  it('should await the event claim and locked run before writing', async () => {
    const probe = createClaimProbe()
    const pending = invoke(probe.database)
    await probe.claimStarted.promise
    expect(probe.transaction.select).not.toHaveBeenCalled()
    expect(probe.update).not.toHaveBeenCalled()

    probe.claim.resolve([{eventId: 'evt-claim'}])
    await probe.lookupStarted.promise
    expect(probe.locks).toEqual(['update'])
    expect(new PgDialect({casing: 'snake_case'}).sqlToQuery(probe.queries[0])).toMatchObject({
      params: [RESPONSE_ID],
      sql: expect.stringContaining('"open_ai_response_id" = $1'),
    })
    expect(probe.update).not.toHaveBeenCalled()
    expect(probe.momentValues).not.toHaveBeenCalled()

    probe.lookup.resolve([createRun('submitted')])
    await expect(pending).resolves.toBe(true)
    expect(probe.update).toHaveBeenCalledOnce()
  })
})

it('should not read response details for a duplicate publish event', async () => {
  const response = createResponseTransaction(createRun('submitted'), {claimed: false})
  const responseId = vi.fn(() => {
    throw new Error('Duplicate event response must not be read')
  })
  await expect(
    publishHistoryResponse(
      {
        ...publishOptions,
        get responseId() {
          return responseId()
        },
      },
      asTransactionalDatabase(response.transaction),
    ),
  ).resolves.toBe(false)
  expect(responseId).not.toHaveBeenCalled()
})

it('should read the response at lookup time and again only for a missing-run error', async () => {
  const probe = createClaimProbe()
  const responseId = vi.fn(() => RESPONSE_ID)
  const outcome = Promise.allSettled([
    publishHistoryResponse(
      {
        ...publishOptions,
        get responseId() {
          return responseId()
        },
      },
      probe.database,
    ),
  ])
  await probe.claimStarted.promise
  expect(responseId).not.toHaveBeenCalled()
  probe.claim.resolve([{eventId: 'evt-claim'}])
  await probe.lookupStarted.promise
  expect(responseId).toHaveBeenCalledOnce()
  probe.lookup.resolve([])
  const [result] = await outcome
  expect(result.status).toBe('rejected')
  if (result.status === 'rejected') {
    expect(result.reason).toEqual(
      new Error(`Generation run not found for response: ${RESPONSE_ID}`),
    )
  }
  expect(responseId).toHaveBeenCalledTimes(2)
})
