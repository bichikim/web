import {expect, it, vi} from 'vitest'
import type {SQL} from 'drizzle-orm'
import {PgDialect} from 'drizzle-orm/pg-core'

import type {HistoryGenerationOutput} from 'src/features/history-generation'
import {
  failHistoryResponse,
  type GenerationRun,
  markGenerationFailed,
  prepareGenerationRerun,
  prepareGenerationRun,
  publishHistoryResponse,
} from '../generation-repository'
import type {Database, TransactionalDatabase} from '../../database'

const RUN_ID = 'run-1'
const RESPONSE_ID = 'resp-1'
const SOURCE_URLS = ['https://example.com/article-a', 'https://example.com/article-b']

interface HistoricalGenerationRunRow {
  readonly attemptCount: number
  readonly channelId: string
  readonly completedAt: Date | null
  readonly createdAt: Date
  readonly errorMessage: string | null
  readonly id: string
  readonly openAiResponseId: string | null
  readonly openAiSubmissionKey: string
  readonly promptVersion: string
  readonly sourcePolicyVersion: string
  readonly sourceUrls: ReadonlyArray<string>
  readonly status: GenerationRun['status']
  readonly targetDate: string
  readonly updatedAt: Date
}

const createRun = (
  status: GenerationRun['status'],
  openAiResponseId: string | null = RESPONSE_ID,
  updatedAt = new Date('2026-08-15T00:00:00.000Z'),
): HistoricalGenerationRunRow => ({
  attemptCount: 1,
  channelId: 'channel-1',
  completedAt: null,
  createdAt: new Date('2026-08-15T00:00:00.000Z'),
  errorMessage: null,
  id: RUN_ID,
  openAiResponseId,
  openAiSubmissionKey: '019d0000-0000-7000-8000-000000000003',
  promptVersion: 'history-prompt-v1',
  sourcePolicyVersion: 'history-sources-v1',
  sourceUrls: [],
  status,
  targetDate: '2026-08-16',
  updatedAt,
})

const createSelectChain = (run: HistoricalGenerationRunRow | undefined) => ({
  for: vi.fn(() => ({
    limit: vi.fn(() => (run === undefined ? [] : [run])),
  })),
  limit: vi.fn(() => (run === undefined ? [] : [run])),
})

const createTransaction = (run: HistoricalGenerationRunRow | undefined) => {
  const update = vi.fn(() => ({where: vi.fn(async () => undefined)}))
  const insert = vi.fn(() => ({
    values: vi.fn(() => ({
      onConflictDoNothing: vi.fn(() => ({
        returning: vi.fn(() => [{eventId: 'evt-1'}]),
      })),
    })),
  }))

  return {
    insert,
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => createSelectChain(run)),
      })),
    })),
    update,
  }
}

const createTransactionalDatabase = (transaction: ReturnType<typeof createTransaction>) =>
  ({
    transaction: vi.fn(async (callback: (tx: typeof transaction) => Promise<boolean>) =>
      callback(transaction),
    ),
  }) as unknown as TransactionalDatabase

const createGenerationDatabase = (
  existing: HistoricalGenerationRunRow,
  reclaimed: HistoricalGenerationRunRow,
) => {
  const select = vi
    .fn()
    .mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => [{id: 'channel-1'}]),
        })),
      })),
    })
    .mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(async () => [existing]),
        })),
      })),
    })
  const insert = vi.fn(() => ({
    values: vi.fn(() => ({
      onConflictDoNothing: vi.fn(() => ({
        returning: vi.fn(async () => []),
      })),
    })),
  }))
  const set = vi.fn((_values: Record<string, unknown>) => ({
    where: vi.fn(() => ({
      returning: vi.fn(async () => [reclaimed]),
    })),
  }))
  const update = vi.fn(() => ({set}))

  return {
    database: {insert, select, update} as unknown as Database,
    set,
    update,
  }
}

const createRerunDatabase = (
  existing: HistoricalGenerationRunRow,
  updated: HistoricalGenerationRunRow,
  selectedTitles: ReadonlyArray<string>,
) => {
  const select = vi
    .fn()
    .mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => ({limit: vi.fn(async () => [{id: 'channel-1'}])})),
      })),
    })
    .mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(async () => selectedTitles.map((title) => ({title}))),
      })),
    })
    .mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => ({limit: vi.fn(async () => [existing])})),
      })),
    })
  const where = vi.fn((_condition: SQL) => ({returning: vi.fn(async () => [updated])}))
  const set = vi.fn((_values: Record<string, unknown>) => ({where}))

  return {
    database: {select, update: vi.fn(() => ({set}))} as unknown as Database,
    set,
    where,
  }
}

const createGenerationMoment = (eventYear: number) =>
  ({
    eventDay: 16,
    eventMonth: 8,
    eventYear,
    historicalEra: 'ce',
    sections: {
      context: {sourceUrls: [...SOURCE_URLS], text: '역사적 배경을 설명하는 문장입니다.'},
      event: {sourceUrls: [...SOURCE_URLS], text: '실제로 일어난 사건을 설명하는 문장입니다.'},
      significance: {sourceUrls: [...SOURCE_URLS], text: '역사적 의미를 설명하는 문장입니다.'},
    },
    sources: [
      {publisher: 'Example A', title: 'Example A', url: SOURCE_URLS[0]},
      {publisher: 'Example B', title: 'Example B', url: SOURCE_URLS[1]},
    ],
    summary: '요약',
    title: `${eventYear}년, 역사적 사건`,
  }) satisfies HistoryGenerationOutput['moments'][number]

const GENERATION = {
  moments: [
    createGenerationMoment(1858),
    createGenerationMoment(1945),
    createGenerationMoment(1969),
  ],
} satisfies HistoryGenerationOutput

it('should reclaim a stale preparing run without a submitted response', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-08-16T00:31:00.000Z'))

  try {
    const existing = createRun('preparing', null)
    const reclaimed = createRun('preparing', null, new Date())
    const {database, set, update} = createGenerationDatabase(existing, reclaimed)

    await expect(
      prepareGenerationRun(
        {
          promptVersion: 'history-prompt-v1',
          sourcePolicyVersion: 'history-sources-v1',
          targetDate: {day: 16, isoDate: '2026-08-16', month: 8},
        },
        database,
      ),
    ).resolves.toEqual({
      created: true,
      run: expect.objectContaining({id: RUN_ID, status: 'preparing'}),
    })

    expect(update).toHaveBeenCalledOnce()
    expect(set).toHaveBeenCalledWith(
      expect.not.objectContaining({openAiSubmissionKey: expect.anything()}),
    )
  } finally {
    vi.useRealTimers()
  }
})

it('should reuse the submission key after an ambiguous submission failure', async () => {
  const existing = createRun('failed', null)
  const retried = {...existing, attemptCount: 2, status: 'preparing' as const}
  const {database, set} = createGenerationDatabase(existing, retried)

  await prepareGenerationRun(
    {
      promptVersion: 'history-prompt-v1',
      sourcePolicyVersion: 'history-sources-v1',
      targetDate: {day: 16, isoDate: '2026-08-16', month: 8},
    },
    database,
  )

  expect(set).toHaveBeenCalledWith(
    expect.objectContaining({openAiSubmissionKey: existing.openAiSubmissionKey}),
  )
})

it('should rotate the submission key after a confirmed terminal response failure', async () => {
  const existing = createRun('failed')
  const retried = {...existing, attemptCount: 2, status: 'preparing' as const}
  const {database, set} = createGenerationDatabase(existing, retried)

  await prepareGenerationRun(
    {
      promptVersion: 'history-prompt-v1',
      sourcePolicyVersion: 'history-sources-v1',
      targetDate: {day: 16, isoDate: '2026-08-16', month: 8},
    },
    database,
  )

  const openAiSubmissionKey = set.mock.calls[0]?.[0].openAiSubmissionKey
  expect(openAiSubmissionKey).not.toBe(existing.openAiSubmissionKey)
  expect(openAiSubmissionKey).toEqual(
    expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u),
  )
})

it('should reuse the submission key when retrying a failed regeneration persistence', async () => {
  const requiredTitles = ['사건 A', '사건 B', '사건 C']
  const existing = createRun('failed', null)
  const updated = {...existing, status: 'preparing' as const}
  const {database, set} = createRerunDatabase(existing, updated, requiredTitles)

  await expect(
    prepareGenerationRerun(
      {
        promptVersion: 'history-prompt-v1',
        requiredTitles,
        sourcePolicyVersion: 'history-sources-v1',
        targetDate: {day: 16, isoDate: '2026-08-16', month: 8},
      },
      database,
    ),
  ).resolves.toEqual(expect.objectContaining({openAiSubmissionKey: existing.openAiSubmissionKey}))
  expect(set).toHaveBeenCalledWith(
    expect.objectContaining({openAiSubmissionKey: existing.openAiSubmissionKey}),
  )
})

it('should reclaim a stale regeneration when retryable-state persistence also failed', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-08-16T01:00:00.000Z'))

  try {
    const requiredTitles = ['사건 A', '사건 B', '사건 C']
    const existing = createRun('preparing', null, new Date('2026-08-16T00:00:00.000Z'))
    const updated = {...existing, status: 'preparing' as const, updatedAt: new Date()}
    const {database, set, where} = createRerunDatabase(existing, updated, requiredTitles)

    await prepareGenerationRerun(
      {
        promptVersion: 'history-prompt-v1',
        requiredTitles,
        sourcePolicyVersion: 'history-sources-v1',
        targetDate: {day: 16, isoDate: '2026-08-16', month: 8},
      },
      database,
    )

    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({openAiSubmissionKey: existing.openAiSubmissionKey}),
    )
    const condition = where.mock.calls[0]?.[0]
    const query = new PgDialect({casing: 'snake_case'}).sqlToQuery(condition)
    expect(query.sql).toContain('"updated_at" < $3')
  } finally {
    vi.useRealTimers()
  }
})

it('should not overwrite a submission that committed before its database acknowledgement failed', async () => {
  const where = vi.fn(async (_condition: SQL) => undefined)
  const database = {
    update: vi.fn(() => ({set: vi.fn(() => ({where}))})),
  } as unknown as Database

  await markGenerationFailed(RUN_ID, 'Database acknowledgement failed', database)

  const condition = where.mock.calls[0]?.[0]
  const query = new PgDialect({casing: 'snake_case'}).sqlToQuery(condition)
  expect(query.sql).toContain('"status" = $2')
  expect(query.sql).toContain('"open_ai_response_id" is null')
  expect(query.params).toEqual([RUN_ID, 'preparing'])
})

it('should ignore publish when the generation run is no longer submitted', async () => {
  const transaction = createTransaction(createRun('completed'))
  const database = createTransactionalDatabase(transaction)

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
  ).resolves.toBe(false)

  expect(transaction.update).not.toHaveBeenCalled()
})

it('should ignore terminal failures when the generation run is already completed', async () => {
  const transaction = createTransaction(createRun('completed'))
  const database = createTransactionalDatabase(transaction)

  await expect(
    failHistoryResponse('evt-1', RESPONSE_ID, 'OpenAI ended with response.failed', database),
  ).resolves.toBe(false)

  expect(transaction.update).not.toHaveBeenCalled()
})
