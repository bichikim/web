/** @vitest-environment node */
import {beforeEach, describe, expect, it, vi} from 'vitest'

const databaseMocks = vi.hoisted(() => ({
  getDatabase: vi.fn(),
  withTransactionalDatabase: vi.fn(),
}))

vi.mock('src/env', () => ({env: {}}))
vi.mock('../../database', async () => {
  const actual = await vi.importActual<typeof import('../../database')>('../../database')
  return {...actual, ...databaseMocks}
})

import {
  claimPaddleProviderEvent,
  listDuePaddleProviderEvents,
  markPaddleProviderEventFailed,
  markPaddleProviderEventProcessed,
  receivePaddleProviderEvent,
} from '../provider-events'

const transactionInsert = vi.fn()
const transactionSelect = vi.fn()
const transactionUpdate = vi.fn()
const transaction = {
  insert: transactionInsert,
  select: transactionSelect,
  update: transactionUpdate,
}
const database = {
  transaction: vi.fn(async (operation: (value: typeof transaction) => Promise<unknown>) =>
    operation(transaction),
  ),
}

const createInsertQuery = (result: ReadonlyArray<unknown>) => ({
  values: vi.fn(() => ({
    onConflictDoNothing: vi.fn(() => ({returning: vi.fn().mockResolvedValue(result)})),
  })),
})

const createSelectQuery = (result: ReadonlyArray<unknown>) => ({
  from: vi.fn(() => ({
    where: vi.fn(() => ({
      limit: vi.fn().mockResolvedValue(result),
    })),
  })),
})

const createClaimQuery = (result: ReadonlyArray<unknown>) => ({
  set: vi.fn(() => ({
    where: vi.fn(() => ({
      returning: vi.fn().mockResolvedValue(result),
    })),
  })),
})

const createUpdateQuery = (result: ReadonlyArray<unknown> = []) => ({
  set: vi.fn(() => ({
    where: vi.fn(() => ({returning: vi.fn().mockResolvedValue(result)})),
  })),
})

beforeEach(() => {
  vi.clearAllMocks()
  transactionInsert.mockReset()
  transactionSelect.mockReset()
  transactionUpdate.mockReset()
  database.transaction.mockImplementation(async (operation) => operation(transaction))
  databaseMocks.withTransactionalDatabase.mockImplementation(async (operation) =>
    operation(database),
  )
  databaseMocks.getDatabase.mockReturnValue({select: transactionSelect})
})

describe('Paddle provider event inbox', () => {
  it('should insert a new event and return its internal ID', async () => {
    transactionInsert.mockReturnValueOnce(createInsertQuery([{id: 'event-1'}]))

    await expect(
      receivePaddleProviderEvent({
        eventType: 'payment_intent.succeeded',
        payload: {id: 'evt-1'},
        providerEventId: 'evt-1',
      }),
    ).resolves.toEqual({eventId: 'event-1', status: 'new'})
    expect(transactionSelect).not.toHaveBeenCalled()
  })

  it('should resolve a duplicate event to the existing inbox row', async () => {
    transactionInsert.mockReturnValueOnce(createInsertQuery([]))
    transactionSelect.mockReturnValueOnce(createSelectQuery([{id: 'event-1'}]))

    await expect(
      receivePaddleProviderEvent({
        eventType: 'payment_intent.succeeded',
        payload: {id: 'evt-1'},
        providerEventId: 'evt-1',
      }),
    ).resolves.toEqual({eventId: 'event-1', status: 'duplicate'})
  })

  it('should claim only an available event lease and increment its attempt count in the database', async () => {
    transactionUpdate.mockReturnValueOnce(
      createClaimQuery([
        {
          attemptCount: 2,
          eventId: 'event-1',
          eventType: 'payment_intent.succeeded',
          payload: {id: 'evt-1'},
          providerEventId: 'evt-1',
        },
      ]),
    )

    await expect(
      claimPaddleProviderEvent('event-1', new Date('2026-09-20T00:00:00.000Z')),
    ).resolves.toEqual({
      attemptCount: 2,
      eventId: 'event-1',
      eventType: 'payment_intent.succeeded',
      payload: {id: 'evt-1'},
      providerEventId: 'evt-1',
    })
  })

  it('should clear a lease after processing and schedule a failed event for retry', async () => {
    transactionUpdate
      .mockReturnValueOnce(createUpdateQuery([{id: 'event-1'}]))
      .mockReturnValueOnce(createUpdateQuery([{id: 'event-1'}]))

    const now = new Date('2026-09-20T00:00:00.000Z')
    await expect(
      markPaddleProviderEventProcessed({attemptCount: 1, eventId: 'event-1', now}),
    ).resolves.toBe(true)
    await expect(
      markPaddleProviderEventFailed({
        errorCode: 'provider_error',
        eventId: 'event-1',
        now,
        retryAttempt: 1,
      }),
    ).resolves.toBe(true)

    const failedSet = transactionUpdate.mock.results[1]?.value.set.mock.calls[0]?.[0]
    expect(failedSet).toMatchObject({
      errorCode: 'provider_error',
      nextAttemptAt: new Date('2026-09-20T00:01:00.000Z'),
      status: 'failed',
    })
  })

  it('should refuse to finish a lease that a later worker has already replaced', async () => {
    transactionUpdate.mockReturnValueOnce(createUpdateQuery())

    await expect(
      markPaddleProviderEventProcessed({attemptCount: 1, eventId: 'event-1'}),
    ).resolves.toBe(false)
  })

  it('should list only due failed Paddle events for the retry worker', async () => {
    const due = {
      eventId: 'event-1',
      eventType: 'payment_intent.succeeded',
      nextAttemptAt: new Date('2026-09-20T00:00:00.000Z'),
      payload: {id: 'evt-1'},
      providerEventId: 'evt-1',
    }
    transactionSelect.mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({limit: vi.fn().mockResolvedValue([due])})),
        })),
      })),
    })

    await expect(
      listDuePaddleProviderEvents(new Date('2026-09-20T00:00:00.000Z')),
    ).resolves.toEqual([due])
  })
})
