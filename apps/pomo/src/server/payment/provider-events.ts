import {and, asc, eq, isNull, lte, or, sql} from 'drizzle-orm'

import {
  commerceProviderEvents,
  getDatabase,
  type TransactionalDatabase,
  withTransactionalDatabase,
} from '../database'

const DEFAULT_RETRY_BATCH_SIZE = 20
const EVENT_LEASE_MILLISECONDS = 300_000
const FIRST_RETRY_DELAY_MILLISECONDS = 60_000
const FOURTH_RETRY_DELAY_MILLISECONDS = 7_200_000
const SECOND_RETRY_DELAY_MILLISECONDS = 300_000
const THIRD_RETRY_DELAY_MILLISECONDS = 1_800_000
const MAX_ERROR_CODE_LENGTH = 64
const RETRY_DELAYS_MILLISECONDS = [
  FIRST_RETRY_DELAY_MILLISECONDS,
  SECOND_RETRY_DELAY_MILLISECONDS,
  THIRD_RETRY_DELAY_MILLISECONDS,
  FOURTH_RETRY_DELAY_MILLISECONDS,
] as const

type PaymentTransaction = Parameters<Parameters<TransactionalDatabase['transaction']>[0]>[0]

export interface ReceivePaddleProviderEventInput {
  readonly eventType: string
  readonly payload: Readonly<Record<string, unknown>>
  readonly providerEventId: string
}

export interface ReceivedPaddleProviderEvent {
  readonly eventId: string
  readonly status: 'duplicate' | 'new'
}

export interface ClaimedPaddleProviderEvent {
  readonly attemptCount: number
  readonly eventId: string
  readonly eventType: string
  readonly payload: Readonly<Record<string, unknown>>
  readonly providerEventId: string
}

export interface MarkPaddleProviderEventProcessedInput {
  readonly attemptCount: number
  readonly eventId: string
  readonly now?: Date
}

export interface DuePaddleProviderEvent {
  readonly eventId: string
  readonly eventType: string
  readonly nextAttemptAt: Date | null
  readonly payload: Readonly<Record<string, unknown>>
  readonly providerEventId: string
}

const insertPaddleProviderEvent = async (
  transaction: PaymentTransaction,
  input: ReceivePaddleProviderEventInput,
): Promise<string | undefined> => {
  const [event] = await transaction
    .insert(commerceProviderEvents)
    .values({
      eventType: input.eventType,
      payload: input.payload,
      provider: 'paddle',
      providerEventId: input.providerEventId,
    })
    .onConflictDoNothing({
      target: [commerceProviderEvents.provider, commerceProviderEvents.providerEventId],
    })
    .returning({id: commerceProviderEvents.id})

  return event?.id
}

export const receivePaddleProviderEvent = async (
  input: ReceivePaddleProviderEventInput,
): Promise<ReceivedPaddleProviderEvent> =>
  withTransactionalDatabase((database) =>
    database.transaction(async (transaction) => {
      const insertedEventId = await insertPaddleProviderEvent(transaction, input)

      if (insertedEventId !== undefined) {
        return {eventId: insertedEventId, status: 'new'}
      }

      const [existingEvent] = await transaction
        .select({id: commerceProviderEvents.id})
        .from(commerceProviderEvents)
        .where(
          and(
            eq(commerceProviderEvents.provider, 'paddle'),
            eq(commerceProviderEvents.providerEventId, input.providerEventId),
          ),
        )
        .limit(1)

      if (existingEvent === undefined) {
        throw new Error('Paddle provider event disappeared after a duplicate insert')
      }

      return {eventId: existingEvent.id, status: 'duplicate'}
    }),
  )

export const claimPaddleProviderEvent = async (
  eventId: string,
  now: Date = new Date(),
): Promise<ClaimedPaddleProviderEvent | null> =>
  withTransactionalDatabase((database) =>
    database.transaction(async (transaction) => {
      const staleBefore = new Date(now.getTime() - EVENT_LEASE_MILLISECONDS)
      const [event] = await transaction
        .update(commerceProviderEvents)
        .set({
          attemptCount: sql<number>`${commerceProviderEvents.attemptCount} + 1`,
          claimedAt: now,
        })
        .where(
          and(
            eq(commerceProviderEvents.id, eventId),
            or(
              eq(commerceProviderEvents.status, 'received'),
              and(
                eq(commerceProviderEvents.status, 'failed'),
                lte(commerceProviderEvents.nextAttemptAt, now),
              ),
            ),
            or(
              isNull(commerceProviderEvents.claimedAt),
              lte(commerceProviderEvents.claimedAt, staleBefore),
            ),
          ),
        )
        .returning({
          attemptCount: commerceProviderEvents.attemptCount,
          eventId: commerceProviderEvents.id,
          eventType: commerceProviderEvents.eventType,
          payload: commerceProviderEvents.payload,
          providerEventId: commerceProviderEvents.providerEventId,
        })

      return event ?? null
    }),
  )

export const markPaddleProviderEventProcessed = async (
  input: MarkPaddleProviderEventProcessedInput,
): Promise<boolean> => {
  const now = input.now ?? new Date()

  return withTransactionalDatabase((database) =>
    database.transaction(async (transaction) => {
      const updated = await transaction
        .update(commerceProviderEvents)
        .set({
          claimedAt: null,
          errorCode: null,
          nextAttemptAt: null,
          processedAt: now,
          status: 'processed',
        })
        .where(
          and(
            eq(commerceProviderEvents.id, input.eventId),
            eq(commerceProviderEvents.attemptCount, input.attemptCount),
          ),
        )
        .returning({id: commerceProviderEvents.id})

      return updated.length > 0
    }),
  )
}

export interface MarkPaddleProviderEventFailedInput {
  readonly errorCode: string
  readonly eventId: string
  readonly now?: Date
  readonly permanent?: boolean
  readonly retryAttempt: number
}

export const markPaddleProviderEventFailed = async (
  input: MarkPaddleProviderEventFailedInput,
): Promise<boolean> => {
  const now = input.now ?? new Date()
  const retryDelay =
    RETRY_DELAYS_MILLISECONDS[
      Math.min(input.retryAttempt - 1, RETRY_DELAYS_MILLISECONDS.length - 1)
    ] ?? RETRY_DELAYS_MILLISECONDS[RETRY_DELAYS_MILLISECONDS.length - 1]
  const nextAttemptAt = input.permanent === true ? null : new Date(now.getTime() + retryDelay)
  const updated = await withTransactionalDatabase((database) =>
    database.transaction((transaction) =>
      transaction
        .update(commerceProviderEvents)
        .set({
          claimedAt: null,
          errorCode: input.errorCode.slice(0, MAX_ERROR_CODE_LENGTH),
          nextAttemptAt,
          status: 'failed',
        })
        .where(
          and(
            eq(commerceProviderEvents.id, input.eventId),
            eq(commerceProviderEvents.attemptCount, input.retryAttempt),
          ),
        )
        .returning({id: commerceProviderEvents.id}),
    ),
  )

  return updated.length > 0
}

export const listDuePaddleProviderEvents = async (
  now: Date = new Date(),
  limit = DEFAULT_RETRY_BATCH_SIZE,
): Promise<ReadonlyArray<DuePaddleProviderEvent>> => {
  const events = await getDatabase()
    .select({
      eventId: commerceProviderEvents.id,
      eventType: commerceProviderEvents.eventType,
      nextAttemptAt: commerceProviderEvents.nextAttemptAt,
      payload: commerceProviderEvents.payload,
      providerEventId: commerceProviderEvents.providerEventId,
    })
    .from(commerceProviderEvents)
    .where(
      and(
        eq(commerceProviderEvents.provider, 'paddle'),
        eq(commerceProviderEvents.status, 'failed'),
        lte(commerceProviderEvents.nextAttemptAt, now),
      ),
    )
    .orderBy(asc(commerceProviderEvents.nextAttemptAt))
    .limit(limit)

  return events
}
