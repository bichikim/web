import {beforeEach, expect, it, vi} from 'vitest'
import type {Database} from '../../database'

import {
  associateGenerationResponse,
  asTransactionalDatabase,
  createResponseTransaction,
  createRun,
  failHistoryResponse,
  findGenerationRun,
  GENERATION,
  listRecoverableGenerationRuns,
  markGenerationSubmitted,
  publishHistoryResponse,
  rejectHistoryResponse,
  RESPONSE_ID,
  RUN_ID,
  SOURCE_URLS,
} from './generation-repository.test-support'

const databaseMocks = vi.hoisted(() => ({
  getDatabase: vi.fn(),
  withTransactionalDatabase: vi.fn(),
}))

vi.mock('../../database', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../database')>()),
  getDatabase: databaseMocks.getDatabase,
  withTransactionalDatabase: databaseMocks.withTransactionalDatabase,
}))

beforeEach(() => {
  databaseMocks.getDatabase.mockReset()
  databaseMocks.withTransactionalDatabase.mockReset()
})

it('should accept the first response persistence acknowledgement', async () => {
  const database = {
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({returning: vi.fn(async () => [{responseId: RESPONSE_ID}])})),
      })),
    })),
  } as unknown as Database

  await expect(markGenerationSubmitted(RUN_ID, RESPONSE_ID, database)).resolves.toBeUndefined()
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

it('should list only recoverable runs with response IDs through the default database', async () => {
  const database = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => [
            {responseId: null},
            {responseId: 'resp-1'},
            {responseId: 'resp-2'},
          ]),
        })),
      })),
    })),
  } as unknown as Database
  databaseMocks.getDatabase.mockReturnValue(database)

  await expect(
    listRecoverableGenerationRuns(new Date('2026-08-16T00:00:00.000Z')),
  ).resolves.toEqual([{responseId: 'resp-1'}, {responseId: 'resp-2'}])
})
