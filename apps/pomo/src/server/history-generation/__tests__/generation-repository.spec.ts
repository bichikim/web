import {beforeEach, expect, it, vi} from 'vitest'
import type {SQL} from 'drizzle-orm'
import {PgDialect} from 'drizzle-orm/pg-core'

import type {HistoryGenerationOutput} from 'src/features/history-generation'
import {
  associateGenerationResponse,
  failHistoryResponse,
  findGenerationRun,
  type GenerationRun,
  listRecoverableGenerationRuns,
  markGenerationFailed,
  markGenerationSubmitted,
  prepareGenerationRerun,
  prepareGenerationRun,
  publishHistoryResponse,
  rejectHistoryResponse,
} from '../generation-repository'
import {
  type Database,
  historicalGenerationRuns,
  historicalMoments,
  processedOpenAiWebhookEvents,
  type TransactionalDatabase,
} from '../../database'

const databaseMocks = vi.hoisted(() => ({
  getDatabase: vi.fn(),
  withTransactionalDatabase: vi.fn(),
}))

vi.mock('../../database', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../database')>()),
  getDatabase: databaseMocks.getDatabase,
  withTransactionalDatabase: databaseMocks.withTransactionalDatabase,
}))

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

const TARGET_DATE = {day: 16, isoDate: '2026-08-16', month: 8} as const
const CREATE_OPTIONS = {
  promptVersion: 'history-prompt-v1',
  sourcePolicyVersion: 'history-sources-v1',
  targetDate: TARGET_DATE,
} as const

const createResponseTransaction = (
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

const asTransactionalDatabase = (transaction: object) =>
  ({
    transaction: vi.fn(async (callback: (value: object) => Promise<boolean>) =>
      callback(transaction),
    ),
  }) as unknown as TransactionalDatabase

beforeEach(() => {
  databaseMocks.getDatabase.mockReset()
  databaseMocks.withTransactionalDatabase.mockReset()
})

it('should not reclaim an ambiguous preparing run', async () => {
  const existing = createRun('preparing', null)
  const {database, update} = createGenerationDatabase(existing, existing)

  await expect(
    prepareGenerationRun(
      {
        promptVersion: 'history-prompt-v1',
        sourcePolicyVersion: 'history-sources-v1',
        targetDate: {day: 16, isoDate: '2026-08-16', month: 8},
      },
      database,
    ),
  ).resolves.toEqual({created: false, run: expect.objectContaining({status: 'preparing'})})
  expect(update).not.toHaveBeenCalled()
})

it('should retry a confirmed failed submission', async () => {
  const existing = createRun('failed', null)
  const retried = {...existing, attemptCount: 2, status: 'preparing' as const}
  const {database, set} = createGenerationDatabase(existing, retried)

  await expect(
    prepareGenerationRun(
      {
        promptVersion: 'history-prompt-v1',
        sourcePolicyVersion: 'history-sources-v1',
        targetDate: {day: 16, isoDate: '2026-08-16', month: 8},
      },
      database,
    ),
  ).resolves.toEqual({created: true, run: expect.objectContaining({status: 'preparing'})})
  const submissionKey = set.mock.calls[0]?.[0].openAiSubmissionKey
  expect(submissionKey).not.toBe(existing.openAiSubmissionKey)
  expect(submissionKey).toEqual(
    expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u),
  )
})

it('should not reopen an ambiguous preparing run for regeneration', async () => {
  const requiredTitles = ['사건 A', '사건 B', '사건 C']
  const existing = createRun('preparing', null)
  const {database} = createRerunDatabase(existing, existing, requiredTitles)

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
  ).rejects.toThrow('Inactive generation run not found')
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

it('should accept a repeated persistence acknowledgement for the same response', async () => {
  const returning = vi.fn(async () => [])
  const database = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({limit: vi.fn(async () => [{responseId: RESPONSE_ID}])})),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({where: vi.fn(() => ({returning}))})),
    })),
  } as unknown as Database

  await expect(markGenerationSubmitted(RUN_ID, RESPONSE_ID, database)).resolves.toBeUndefined()
})

it('should reject persistence when a different response owns the run', async () => {
  const returning = vi.fn(async () => [])
  const database = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({limit: vi.fn(async () => [{responseId: 'resp-other'}])})),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({where: vi.fn(() => ({returning}))})),
    })),
  } as unknown as Database

  await expect(markGenerationSubmitted(RUN_ID, RESPONSE_ID, database)).rejects.toThrow(
    'Generation run did not accept response',
  )
})

it('should associate a webhook response with an ambiguous preparing run', async () => {
  const associated = createRun('submitted')
  const select = vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({limit: vi.fn(async () => [])})),
    })),
  }))
  const returning = vi.fn(async () => [associated])
  const where = vi.fn((_condition: SQL) => ({returning}))
  const set = vi.fn((_values: Record<string, unknown>) => ({where}))
  const database = {select, update: vi.fn(() => ({set}))} as unknown as Database

  await expect(
    associateGenerationResponse(RESPONSE_ID, RUN_ID, associated.openAiSubmissionKey, database),
  ).resolves.toMatchObject({id: RUN_ID, openAiResponseId: RESPONSE_ID, status: 'submitted'})
  expect(set).toHaveBeenCalledWith(
    expect.objectContaining({openAiResponseId: RESPONSE_ID, status: 'submitted'}),
  )

  const condition = where.mock.calls[0]?.[0]
  const query = new PgDialect({casing: 'snake_case'}).sqlToQuery(condition)
  expect(query.sql).toContain('"id" = $1')
  expect(query.sql).toContain('"status" = $2')
  expect(query.sql).toContain('"open_ai_submission_key" = $3')
  expect(query.sql).toContain('"open_ai_response_id" is null')
  expect(query.params).toEqual([RUN_ID, 'preparing', associated.openAiSubmissionKey])
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

it('should reject generation preparation when the enabled channel is missing', async () => {
  const database = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({where: vi.fn(() => ({limit: vi.fn(async () => [])}))})),
    })),
  } as unknown as Database

  await expect(prepareGenerationRun(CREATE_OPTIONS, database)).rejects.toThrow(
    'Enabled feed channel not found: today-in-history',
  )
})

it('should return a newly inserted generation run', async () => {
  const inserted = createRun('preparing', null)
  const database = {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoNothing: vi.fn(() => ({returning: vi.fn(async () => [inserted])})),
      })),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({limit: vi.fn(async () => [{id: 'channel-1'}])})),
      })),
    })),
  } as unknown as Database

  await expect(prepareGenerationRun(CREATE_OPTIONS, database)).resolves.toEqual({
    created: true,
    run: expect.objectContaining({id: RUN_ID, status: 'preparing'}),
  })
})

it('should report a generation run lost after its uniqueness conflict', async () => {
  const select = vi
    .fn()
    .mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => ({limit: vi.fn(async () => [{id: 'channel-1'}])})),
      })),
    })
    .mockReturnValueOnce({
      from: vi.fn(() => ({where: vi.fn(() => ({limit: vi.fn(async () => [])}))})),
    })
  const database = {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoNothing: vi.fn(() => ({returning: vi.fn(async () => [])})),
      })),
    })),
    select,
  } as unknown as Database

  await expect(prepareGenerationRun(CREATE_OPTIONS, database)).rejects.toThrow(
    'Generation run disappeared after a uniqueness conflict',
  )
})

it('should retain the failed run when its retry loses a database race', async () => {
  const existing = createRun('failed', null)
  const {database} = createGenerationDatabase(existing, existing)
  const returning = vi.fn(async () => [])
  const racedDatabase = {
    ...database,
    update: vi.fn(() => ({set: vi.fn(() => ({where: vi.fn(() => ({returning}))}))})),
  } as unknown as Database

  await expect(prepareGenerationRun(CREATE_OPTIONS, racedDatabase)).resolves.toEqual({
    created: false,
    run: expect.objectContaining({status: 'failed'}),
  })
})

it('should reject a rerun when any required title is not published', async () => {
  const existing = createRun('completed')
  const {database} = createRerunDatabase(existing, existing, ['사건 A'])

  await expect(
    prepareGenerationRerun({...CREATE_OPTIONS, requiredTitles: ['사건 A', '누락 사건']}, database),
  ).rejects.toThrow('Every regeneration title must match an existing published moment')
})

it.each(['completed', 'failed', 'rejected'] as const)(
  'should reopen a %s run for regeneration',
  async (status) => {
    const existing = createRun(status)
    const updated = {...existing, status: 'preparing' as const}
    const {database} = createRerunDatabase(existing, updated, ['사건 A'])

    await expect(
      prepareGenerationRerun({...CREATE_OPTIONS, requiredTitles: ['사건 A']}, database),
    ).resolves.toMatchObject({id: RUN_ID, status: 'preparing'})
  },
)

it('should reject a rerun when no run exists or its update loses a race', async () => {
  const requiredTitles = ['사건 A']
  const missing = createRerunDatabase(
    createRun('completed'),
    createRun('completed'),
    requiredTitles,
  )
  const missingSelect = vi
    .fn()
    .mockReturnValueOnce({
      from: vi.fn(() => ({where: vi.fn(() => ({limit: vi.fn(async () => [{id: 'channel-1'}])}))})),
    })
    .mockReturnValueOnce({
      from: vi.fn(() => ({where: vi.fn(async () => [{title: '사건 A'}])})),
    })
    .mockReturnValueOnce({
      from: vi.fn(() => ({where: vi.fn(() => ({limit: vi.fn(async () => [])}))})),
    })

  await expect(
    prepareGenerationRerun({...CREATE_OPTIONS, requiredTitles}, {
      ...missing.database,
      select: missingSelect,
    } as unknown as Database),
  ).rejects.toThrow('Inactive generation run not found')

  const existing = createRun('completed')
  const raced = createRerunDatabase(existing, existing, requiredTitles)
  raced.where.mockReturnValueOnce({returning: vi.fn(async () => [])})
  await expect(
    prepareGenerationRerun({...CREATE_OPTIONS, requiredTitles}, raced.database),
  ).rejects.toThrow('Inactive generation run not found')
})

it('should reject an unknown rerun status defensively', async () => {
  const existing = {
    ...createRun('completed'),
    status: 'unknown',
  } as unknown as HistoricalGenerationRunRow
  const {database} = createRerunDatabase(existing, existing, ['사건 A'])

  await expect(
    prepareGenerationRerun({...CREATE_OPTIONS, requiredTitles: ['사건 A']}, database),
  ).rejects.toThrow('Unhandled generation status: unknown')
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
