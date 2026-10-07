import {and, count, eq, gt} from 'drizzle-orm'
import {type CloudTextUsage} from 'src/features/cloud-text/contracts'
import {
  cloudTextRequests,
  type Database,
  getDatabase,
  pomoUsers,
  withTransactionalDatabase,
} from '../database'
import {createCloudTextUsage, getCloudTextUsageCondition} from './usage'
import {readUserCloudTextLimits} from './read-user-limits'

const RESERVATION_MILLISECONDS = 180_000

export interface ReserveCloudTextOptions {
  readonly now: Date
  readonly requestHash: string
  readonly requestId: string
  readonly userId: string
}

export type CloudTextReservation =
  | {readonly kind: 'reserved'; readonly usage: CloudTextUsage}
  | {
      readonly kind: 'existing'
      readonly text: string
      readonly tokenCount: number
      readonly usage: CloudTextUsage
    }
  | {readonly kind: 'conflict' | 'pending' | 'failed' | 'exhausted'; readonly usage: CloudTextUsage}

const readUsage = async (
  database: Pick<Database, 'select'>,
  userId: string,
  now: Date,
): Promise<CloudTextUsage> => {
  const [[usage], limits] = await Promise.all([
    database
      .select({used: count()})
      .from(cloudTextRequests)
      .where(and(eq(cloudTextRequests.userId, userId), getCloudTextUsageCondition(now))),
    readUserCloudTextLimits(database, [userId], now),
  ])
  return createCloudTextUsage(usage?.used ?? 0, now, limits.get(userId)?.limit)
}

/** Reads the allowance shared by all cloud text features. */
export const readCloudTextUsage = (userId: string, now = new Date()): Promise<CloudTextUsage> =>
  readUsage(getDatabase(), userId, now)

/** Reserves one account-wide generation under a durable per-user lock. */
export const reserveCloudText = (options: ReserveCloudTextOptions): Promise<CloudTextReservation> =>
  withTransactionalDatabase((database) =>
    database.transaction(async (transaction) => {
      await transaction
        .select({id: pomoUsers.id})
        .from(pomoUsers)
        .where(eq(pomoUsers.id, options.userId))
        .for('update')
      const usage = await readUsage(transaction, options.userId, options.now)
      const [existing] = await transaction
        .select()
        .from(cloudTextRequests)
        .where(
          and(
            eq(cloudTextRequests.id, options.requestId),
            eq(cloudTextRequests.userId, options.userId),
          ),
        )
      if (existing !== undefined) {
        if (existing.requestHash !== options.requestHash) {
          return {kind: 'conflict', usage}
        }
        if (existing.status === 'complete' && existing.result !== null) {
          return {kind: 'existing', text: existing.result, tokenCount: existing.tokenCount, usage}
        }
        return {
          kind:
            existing.status === 'pending' && existing.expiresAt > options.now
              ? 'pending'
              : 'failed',
          usage,
        }
      }
      if (usage.remaining === 0) {
        return {kind: 'exhausted', usage}
      }
      await transaction.insert(cloudTextRequests).values({
        day: usage.day,
        expiresAt: new Date(options.now.getTime() + RESERVATION_MILLISECONDS),
        id: options.requestId,
        requestHash: options.requestHash,
        status: 'pending',
        userId: options.userId,
      })
      return {
        kind: 'reserved',
        usage: createCloudTextUsage(usage.used + 1, options.now, usage.limit),
      }
    }),
  )

export interface CompleteCloudTextOptions {
  readonly now?: Date
  readonly requestId: string
  readonly text: string
  readonly tokenCount: number
  readonly userId: string
}

/** Records success only while the request still owns its reserved allowance. */
export const completeCloudText = async (options: CompleteCloudTextOptions): Promise<void> => {
  const {userId, requestId, text, tokenCount, now = new Date()} = options
  const [completed] = await getDatabase()
    .update(cloudTextRequests)
    .set({result: text, status: 'complete', tokenCount})
    .where(
      and(
        eq(cloudTextRequests.userId, userId),
        eq(cloudTextRequests.id, requestId),
        eq(cloudTextRequests.status, 'pending'),
        gt(cloudTextRequests.expiresAt, now),
      ),
    )
    .returning({id: cloudTextRequests.id})
  if (completed === undefined) {
    throw new Error('Cloud text reservation expired before completion')
  }
}

/** Releases a failed reservation without altering completed generations. */
export const releaseCloudText = async (userId: string, requestId: string): Promise<void> => {
  await getDatabase()
    .update(cloudTextRequests)
    .set({status: 'failed'})
    .where(
      and(
        eq(cloudTextRequests.userId, userId),
        eq(cloudTextRequests.id, requestId),
        eq(cloudTextRequests.status, 'pending'),
      ),
    )
}
