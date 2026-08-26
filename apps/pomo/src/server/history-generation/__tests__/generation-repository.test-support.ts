// oxlint-disable eslint/max-nested-callbacks, eslint/no-magic-numbers -- Drizzle chain fixtures mirror the query builder, and event years are fixture data.

import {vi} from 'vitest'
import type {SQL} from 'drizzle-orm'

import type {HistoryGenerationOutput} from 'src/features/history-generation'
import type {GenerationRun} from '../generation-repository'
import {
  type Database,
  historicalMoments,
  processedOpenAiWebhookEvents,
  type TransactionalDatabase,
} from '../../database'

export {
  associateGenerationResponse,
  failHistoryResponse,
  findGenerationRun,
  listRecoverableGenerationRuns,
  markGenerationFailed,
  markGenerationSubmitted,
  prepareGenerationRerun,
  prepareGenerationRun,
  publishHistoryResponse,
  rejectHistoryResponse,
} from '../generation-repository'

export const RUN_ID = 'run-1'
export const RESPONSE_ID = 'resp-1'
export const SOURCE_URLS = ['https://example.com/article-a', 'https://example.com/article-b']

export interface HistoricalGenerationRunRow {
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

export const createRun = (
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

export const createTransaction = (run: HistoricalGenerationRunRow | undefined) => {
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

export const createTransactionalDatabase = (transaction: ReturnType<typeof createTransaction>) =>
  ({
    transaction: vi.fn(async (callback: (tx: typeof transaction) => Promise<boolean>) =>
      callback(transaction),
    ),
  }) as unknown as TransactionalDatabase

export const createGenerationDatabase = (
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

export const createRerunDatabase = (
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

export const GENERATION = {
  moments: [
    createGenerationMoment(1858),
    createGenerationMoment(1945),
    createGenerationMoment(1969),
  ],
} satisfies HistoryGenerationOutput

export const TARGET_DATE = {day: 16, isoDate: '2026-08-16', month: 8} as const
export const CREATE_OPTIONS = {
  promptVersion: 'history-prompt-v1',
  sourcePolicyVersion: 'history-sources-v1',
  targetDate: TARGET_DATE,
} as const

export const createResponseTransaction = (
  run: HistoricalGenerationRunRow | undefined,
  options: {readonly claimed?: boolean; readonly storeMoment?: boolean} = {},
) => {
  const claimed = options.claimed ?? true
  const storeMoment = options.storeMoment ?? true
  const momentValues = vi.fn()
  const sourceValues = vi.fn(async () => undefined)
  const insert = vi.fn((table: unknown) => {
    if (table === processedOpenAiWebhookEvents) {
      return {
        values: vi.fn(() => ({
          onConflictDoNothing: vi.fn(() => ({
            returning: vi.fn(async () => (claimed ? [{eventId: 'evt-1'}] : [])),
          })),
        })),
      }
    }

    if (table === historicalMoments) {
      return {
        values: vi.fn((values: unknown) => {
          momentValues(values)
          return {
            onConflictDoUpdate: vi.fn(() => ({
              returning: vi.fn(async () => (storeMoment ? [{id: 'moment-1'}] : [])),
            })),
          }
        }),
      }
    }

    return {values: sourceValues}
  })
  const update = vi.fn(() => ({
    set: vi.fn(() => ({where: vi.fn(async () => undefined)})),
  }))
  const transaction = {
    delete: vi.fn(() => ({where: vi.fn(async () => undefined)})),
    insert,
    select: vi.fn(() => ({
      from: vi.fn(() => ({where: vi.fn(() => createSelectChain(run))})),
    })),
    update,
  }

  return {insert, momentValues, sourceValues, transaction, update}
}

export const asTransactionalDatabase = (transaction: object) =>
  ({
    transaction: vi.fn(async (callback: (value: object) => Promise<boolean>) =>
      callback(transaction),
    ),
  }) as unknown as TransactionalDatabase
