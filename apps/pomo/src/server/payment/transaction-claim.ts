import {and, eq, or} from 'drizzle-orm'

import {commerceOrders, withTransactionalDatabase} from '../database'

export interface SavePaddleTransactionInput {
  readonly claimId: string
  readonly orderId: string
  readonly transactionId: string
  readonly userId: string
}

export const savePaddleTransaction = async (input: SavePaddleTransactionInput): Promise<boolean> =>
  withTransactionalDatabase((database) =>
    database.transaction(async (transaction) => {
      const rows = await transaction
        .update(commerceOrders)
        .set({providerSessionId: input.transactionId, updatedAt: new Date()})
        .where(
          and(
            eq(commerceOrders.id, input.orderId),
            eq(commerceOrders.provider, 'paddle'),
            eq(commerceOrders.userId, input.userId),
            or(
              eq(commerceOrders.providerSessionId, input.claimId),
              eq(commerceOrders.providerSessionId, input.transactionId),
            ),
          ),
        )
        .returning({id: commerceOrders.id})

      return rows.length > 0
    }),
  )

export type PaddleTransactionClaim =
  | {readonly status: 'claimed'; readonly claimId: string}
  | {readonly status: 'creating'}
  | {readonly status: 'existing'; readonly transactionId: string}

export const claimPaddleTransactionCreation = async (
  orderId: string,
  userId: string,
): Promise<PaddleTransactionClaim> =>
  withTransactionalDatabase((database) =>
    database.transaction(async (transaction) => {
      const [order] = await transaction
        .select({providerSessionId: commerceOrders.providerSessionId})
        .from(commerceOrders)
        .where(
          and(
            eq(commerceOrders.id, orderId),
            eq(commerceOrders.provider, 'paddle'),
            eq(commerceOrders.status, 'pending'),
            eq(commerceOrders.userId, userId),
          ),
        )
        .for('update')
        .limit(1)

      if (order === undefined) {
        throw new Error('Paddle order disappeared before transaction creation')
      }

      if (order.providerSessionId?.startsWith('txn_')) {
        return {status: 'existing', transactionId: order.providerSessionId}
      }

      if (order.providerSessionId !== null) {
        return {status: 'creating'}
      }

      const claimId = `creating:${crypto.randomUUID()}`
      await transaction
        .update(commerceOrders)
        .set({providerSessionId: claimId, updatedAt: new Date()})
        .where(eq(commerceOrders.id, orderId))

      return {claimId, status: 'claimed'}
    }),
  )
