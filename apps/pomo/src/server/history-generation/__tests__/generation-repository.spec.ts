import {expect, it, vi} from 'vitest'

import {
  failHistoryResponse,
  publishHistoryResponse,
  type GenerationRun,
} from '../generation-repository'

const RUN_ID = 'run-1'
const RESPONSE_ID = 'resp-1'

interface HistoricalGenerationRunRow {
  readonly attemptCount: number
  readonly channelId: string
  readonly completedAt: Date | null
  readonly createdAt: Date
  readonly errorMessage: string | null
  readonly id: string
  readonly openAiResponseId: string | null
  readonly promptVersion: string
  readonly sourcePolicyVersion: string
  readonly sourceUrls: ReadonlyArray<string>
  readonly status: GenerationRun['status']
  readonly targetDate: string
  readonly updatedAt: Date
}

const createRun = (status: GenerationRun['status']): HistoricalGenerationRunRow => ({
  attemptCount: 1,
  channelId: 'channel-1',
  completedAt: null,
  createdAt: new Date('2026-08-15T00:00:00.000Z'),
  errorMessage: null,
  id: RUN_ID,
  openAiResponseId: RESPONSE_ID,
  promptVersion: 'history-prompt-v1',
  sourcePolicyVersion: 'history-sources-v1',
  sourceUrls: [],
  status,
  targetDate: '2026-08-16',
  updatedAt: new Date('2026-08-15T00:00:00.000Z'),
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

const createTransactionalDatabase = (transaction: ReturnType<typeof createTransaction>) => ({
  transaction: vi.fn(async (callback: (tx: typeof transaction) => Promise<boolean>) =>
    callback(transaction),
  ),
})

const GENERATION = {
  moments: [
    {
      eventDay: 16,
      eventMonth: 8,
      eventYear: 1858,
      historicalEra: 'modern',
      sources: [{publisher: 'Example', title: 'Example', url: 'https://example.com/article'}],
      summary: '요약',
      title: '1858년, 대서양 횡단 전신 첫 교신',
    },
  ],
}

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
        searchSourceUrls: ['https://example.com/article'],
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
