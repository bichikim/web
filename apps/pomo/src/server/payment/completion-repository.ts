import {and, eq, isNull, sql} from 'drizzle-orm'

import type {PaddlePrice, PaddleTransactionSnapshot} from './providers/paddle'
import {
  commerceEntitlementGrants,
  commerceOrderItems,
  commerceOrderReservations,
  commerceOrders,
  getDatabase,
  type TransactionalDatabase,
  withTransactionalDatabase,
} from '../database'

type PaymentTransaction = Parameters<Parameters<TransactionalDatabase['transaction']>[0]>[0]

export type PaddlePaymentOrderStatus =
  | 'canceled'
  | 'failed'
  | 'paid'
  | 'partially_refunded'
  | 'pending'
  | 'refunded'

export type PaddlePaymentEntitlementStatus = 'granted' | 'missing' | 'revoked'

export interface PaddlePaymentOrderStatusView {
  readonly amountMinor: bigint
  readonly currency: string
  readonly entitlementStatus: PaddlePaymentEntitlementStatus
  readonly orderId: string
  readonly productId: string
  readonly providerPaymentIntentId: string | null
  readonly providerSessionId: string | null
  readonly status: PaddlePaymentOrderStatus
}

export interface PaddlePaymentReconciliationContext {
  readonly orderId: string
  readonly productId: string
  readonly providerPaymentIntentId: string | null
  readonly providerSessionId: string | null
  readonly status: PaddlePaymentOrderStatus
  readonly userId: string
}

export interface PaddlePaymentEvidence {
  readonly amountMinor: bigint
  readonly currency: string
  readonly orderId: string
  readonly priceId: string
  readonly productId: string
  readonly providerPaymentIntentId: string | null
  readonly providerSessionId: string | null
  readonly userId: string
}

export interface PaddlePaymentRefundEvidence {
  readonly currency: string
  readonly orderId: string
  readonly providerPaymentIntentId: string | null
  readonly productId: string
  readonly totalRefundedMinor: bigint
  readonly userId: string
}

export class PaddlePaymentValidationError extends Error {
  readonly code:
    | 'order_not_found'
    | 'order_owner_mismatch'
    | 'payment_identity_mismatch'
    | 'payment_price_mismatch'

  constructor(code: PaddlePaymentValidationError['code']) {
    super(`Paddle payment order validation failed: ${code}`)
    this.code = code
    this.name = 'PaddlePaymentValidationError'
  }
}

interface LockedPaddlePaymentOrder {
  readonly amountMinor: bigint
  readonly currency: string
  readonly itemId: string
  readonly itemProductId: string
  readonly itemPriceId: string | null
  readonly orderId: string
  readonly orderStatus: PaddlePaymentOrderStatus
  readonly providerPaymentIntentId: string | null
  readonly providerSessionId: string | null
  readonly refundedAmountMinor: bigint
  readonly userId: string
}

const readLockedPaddlePaymentOrder = async (
  transaction: PaymentTransaction,
  orderId: string,
): Promise<LockedPaddlePaymentOrder | undefined> => {
  const [order] = await transaction
    .select({
      amountMinor: commerceOrders.amountMinor,
      currency: commerceOrders.currency,
      itemId: commerceOrderItems.id,
      itemPriceId: commerceOrderItems.providerExternalProductId,
      itemProductId: commerceOrderItems.productId,
      orderId: commerceOrders.id,
      orderStatus: commerceOrders.status,
      providerPaymentIntentId: commerceOrders.providerPaymentIntentId,
      providerSessionId: commerceOrders.providerSessionId,
      refundedAmountMinor: commerceOrders.refundedAmountMinor,
      userId: commerceOrders.userId,
    })
    .from(commerceOrders)
    .innerJoin(commerceOrderItems, eq(commerceOrderItems.orderId, commerceOrders.id))
    .where(and(eq(commerceOrders.id, orderId), eq(commerceOrders.provider, 'paddle')))
    .for('update')
    .limit(1)

  return order
}

const lockPaddlePaymentProduct = async (
  transaction: PaymentTransaction,
  userId: string,
  productId: string,
): Promise<void> => {
  const lockKey = `commerce-payment:${userId}:${productId}`
  await transaction.execute(sql`select pg_advisory_xact_lock(hashtext(${lockKey}))`)
}

const readPaddleEntitlement = async (
  transaction: PaymentTransaction,
  orderItemId: string,
): Promise<{readonly id: string; readonly revokedAt: Date | null} | undefined> => {
  const [entitlement] = await transaction
    .select({id: commerceEntitlementGrants.id, revokedAt: commerceEntitlementGrants.revokedAt})
    .from(commerceEntitlementGrants)
    .where(eq(commerceEntitlementGrants.orderItemId, orderItemId))
    .limit(1)

  return entitlement
}

const validatePaymentEvidence = (
  order: LockedPaddlePaymentOrder,
  evidence: PaddlePaymentEvidence,
): void => {
  if (order.userId !== evidence.userId || order.itemProductId !== evidence.productId) {
    throw new PaddlePaymentValidationError('order_owner_mismatch')
  }

  if (
    order.amountMinor !== evidence.amountMinor ||
    order.currency !== evidence.currency ||
    order.itemPriceId !== evidence.priceId
  ) {
    throw new PaddlePaymentValidationError('payment_price_mismatch')
  }

  if (
    (order.providerSessionId !== null &&
      !order.providerSessionId.startsWith('creating:') &&
      evidence.providerSessionId !== null &&
      order.providerSessionId !== evidence.providerSessionId) ||
    (order.providerPaymentIntentId !== null &&
      evidence.providerPaymentIntentId !== null &&
      order.providerPaymentIntentId !== evidence.providerPaymentIntentId)
  ) {
    throw new PaddlePaymentValidationError('payment_identity_mismatch')
  }
}

const validateRefundEvidence = (
  order: LockedPaddlePaymentOrder,
  evidence: PaddlePaymentRefundEvidence,
): void => {
  if (order.userId !== evidence.userId || order.itemProductId !== evidence.productId) {
    throw new PaddlePaymentValidationError('order_owner_mismatch')
  }

  if (order.currency !== evidence.currency) {
    throw new PaddlePaymentValidationError('payment_price_mismatch')
  }

  if (
    order.providerPaymentIntentId !== null &&
    order.providerPaymentIntentId !== evidence.providerPaymentIntentId
  ) {
    throw new PaddlePaymentValidationError('payment_identity_mismatch')
  }

  if (evidence.totalRefundedMinor > order.amountMinor) {
    throw new PaddlePaymentValidationError('payment_price_mismatch')
  }
}

const releasePaddlePaymentReservation = async (
  transaction: PaymentTransaction,
  orderId: string,
  now: Date,
): Promise<void> => {
  await transaction
    .update(commerceOrderReservations)
    .set({releasedAt: now, status: 'released'})
    .where(
      and(
        eq(commerceOrderReservations.orderId, orderId),
        eq(commerceOrderReservations.status, 'active'),
      ),
    )
}

const revokePaddleEntitlement = async (
  transaction: PaymentTransaction,
  orderItemId: string,
  now: Date,
): Promise<boolean> => {
  const revoked = await transaction
    .update(commerceEntitlementGrants)
    .set({revokedAt: now, revokeReason: 'paddle_full_refund'})
    .where(
      and(
        eq(commerceEntitlementGrants.orderItemId, orderItemId),
        isNull(commerceEntitlementGrants.revokedAt),
      ),
    )
    .returning({id: commerceEntitlementGrants.id})

  return revoked.length > 0
}

const toPaymentStatusView = async (
  transaction: PaymentTransaction,
  order: LockedPaddlePaymentOrder,
): Promise<PaddlePaymentOrderStatusView> => {
  const entitlement = await readPaddleEntitlement(transaction, order.itemId)
  const entitlementStatus: PaddlePaymentEntitlementStatus =
    entitlement === undefined ? 'missing' : entitlement.revokedAt === null ? 'granted' : 'revoked'

  return {
    amountMinor: order.amountMinor,
    currency: order.currency,
    entitlementStatus,
    orderId: order.orderId,
    productId: order.itemProductId,
    providerPaymentIntentId: order.providerPaymentIntentId,
    providerSessionId: order.providerSessionId,
    status: order.orderStatus,
  }
}

export type PaddleFulfillmentResult = 'already_granted' | 'granted' | 'refunded'

export const fulfillPaddlePayment = async (
  evidence: PaddlePaymentEvidence,
  now: Date = new Date(),
): Promise<PaddleFulfillmentResult> =>
  withTransactionalDatabase((database) =>
    database.transaction(async (transaction) => {
      await lockPaddlePaymentProduct(transaction, evidence.userId, evidence.productId)
      const order = await readLockedPaddlePaymentOrder(transaction, evidence.orderId)

      if (order === undefined) {
        throw new PaddlePaymentValidationError('order_not_found')
      }

      validatePaymentEvidence(order, evidence)
      const entitlement = await readPaddleEntitlement(transaction, order.itemId)

      if (
        order.orderStatus === 'refunded' ||
        order.refundedAmountMinor >= order.amountMinor ||
        (entitlement !== undefined && entitlement.revokedAt !== null)
      ) {
        await revokePaddleEntitlement(transaction, order.itemId, now)
        return 'refunded'
      }

      const nextStatus = order.refundedAmountMinor > 0n ? 'partially_refunded' : 'paid'
      await transaction
        .update(commerceOrders)
        .set({
          paidAt: now,
          providerPaymentIntentId:
            evidence.providerPaymentIntentId ?? order.providerPaymentIntentId,
          providerSessionId: evidence.providerSessionId ?? order.providerSessionId,
          status: nextStatus,
          updatedAt: now,
        })
        .where(eq(commerceOrders.id, order.orderId))

      const [grant] = await transaction
        .insert(commerceEntitlementGrants)
        .values({
          orderItemId: order.itemId,
          productId: order.itemProductId,
          startsAt: now,
          userId: order.userId,
        })
        .onConflictDoNothing({target: commerceEntitlementGrants.orderItemId})
        .returning({id: commerceEntitlementGrants.id})

      await releasePaddlePaymentReservation(transaction, order.orderId, now)

      return grant === undefined ? 'already_granted' : 'granted'
    }),
  )

export type PaddleRevocationResult = 'already_revoked' | 'partial' | 'revoked' | 'unpaid'

export const revokePaddlePayment = async (
  evidence: PaddlePaymentRefundEvidence,
  confirmed: boolean,
  now: Date = new Date(),
): Promise<PaddleRevocationResult> =>
  withTransactionalDatabase((database) =>
    database.transaction(async (transaction) => {
      await lockPaddlePaymentProduct(transaction, evidence.userId, evidence.productId)
      const order = await readLockedPaddlePaymentOrder(transaction, evidence.orderId)

      if (order === undefined) {
        throw new PaddlePaymentValidationError('order_not_found')
      }

      validateRefundEvidence(order, evidence)

      if (!confirmed || evidence.totalRefundedMinor === 0n) {
        return 'unpaid'
      }

      const totalRefundedMinor =
        evidence.totalRefundedMinor > order.refundedAmountMinor
          ? evidence.totalRefundedMinor
          : order.refundedAmountMinor
      const isFullRefund = totalRefundedMinor >= order.amountMinor

      await transaction
        .update(commerceOrders)
        .set({
          providerPaymentIntentId:
            evidence.providerPaymentIntentId ?? order.providerPaymentIntentId,
          refundedAmountMinor: totalRefundedMinor,
          refundedAt: isFullRefund ? now : undefined,
          status: isFullRefund ? 'refunded' : 'partially_refunded',
          updatedAt: now,
        })
        .where(eq(commerceOrders.id, order.orderId))

      if (!isFullRefund) {
        return 'partial'
      }

      const revoked = await revokePaddleEntitlement(transaction, order.itemId, now)

      return revoked ? 'revoked' : 'already_revoked'
    }),
  )

export interface ClosePaddlePaymentInput {
  readonly orderId: string
  readonly productId: string
  readonly providerPaymentIntentId: string | null
  readonly providerSessionId: string | null
  readonly userId: string
}

export const closePaddlePayment = async (
  input: ClosePaddlePaymentInput,
  status: Extract<PaddlePaymentOrderStatus, 'canceled' | 'failed'>,
  now: Date = new Date(),
): Promise<PaddlePaymentOrderStatus> =>
  withTransactionalDatabase((database) =>
    database.transaction(async (transaction) => {
      await lockPaddlePaymentProduct(transaction, input.userId, input.productId)
      const order = await readLockedPaddlePaymentOrder(transaction, input.orderId)

      if (order === undefined) {
        throw new PaddlePaymentValidationError('order_not_found')
      }

      if (order.userId !== input.userId || order.itemProductId !== input.productId) {
        throw new PaddlePaymentValidationError('order_owner_mismatch')
      }

      if (
        (order.providerSessionId !== null &&
          input.providerSessionId !== null &&
          order.providerSessionId !== input.providerSessionId) ||
        (order.providerPaymentIntentId !== null &&
          input.providerPaymentIntentId !== null &&
          order.providerPaymentIntentId !== input.providerPaymentIntentId)
      ) {
        throw new PaddlePaymentValidationError('payment_identity_mismatch')
      }

      if (
        order.orderStatus === 'paid' ||
        order.orderStatus === 'partially_refunded' ||
        order.orderStatus === 'refunded'
      ) {
        return order.orderStatus
      }

      await transaction
        .update(commerceOrders)
        .set({
          canceledAt: status === 'canceled' ? now : undefined,
          failedAt: status === 'failed' ? now : undefined,
          providerPaymentIntentId: input.providerPaymentIntentId,
          providerSessionId: input.providerSessionId,
          status,
          updatedAt: now,
        })
        .where(eq(commerceOrders.id, order.orderId))
      await releasePaddlePaymentReservation(transaction, order.orderId, now)

      return status
    }),
  )

export const findPaddlePaymentReconciliationContext = async (
  orderId: string,
  userId: string,
): Promise<PaddlePaymentReconciliationContext | null> => {
  const [order] = await getDatabase()
    .select({
      orderId: commerceOrders.id,
      productId: commerceOrderItems.productId,
      providerPaymentIntentId: commerceOrders.providerPaymentIntentId,
      providerSessionId: commerceOrders.providerSessionId,
      status: commerceOrders.status,
      userId: commerceOrders.userId,
    })
    .from(commerceOrders)
    .innerJoin(commerceOrderItems, eq(commerceOrderItems.orderId, commerceOrders.id))
    .where(
      and(
        eq(commerceOrders.id, orderId),
        eq(commerceOrders.provider, 'paddle'),
        eq(commerceOrders.userId, userId),
      ),
    )
    .limit(1)

  return order ?? null
}

export const findPaddlePaymentOrderStatus = async (
  orderId: string,
  userId: string,
): Promise<PaddlePaymentOrderStatusView | null> => {
  const context = await findPaddlePaymentReconciliationContext(orderId, userId)

  if (context === null) {
    return null
  }

  const [order] = await getDatabase()
    .select({
      amountMinor: commerceOrders.amountMinor,
      currency: commerceOrders.currency,
      itemId: commerceOrderItems.id,
      productId: commerceOrderItems.productId,
    })
    .from(commerceOrders)
    .innerJoin(commerceOrderItems, eq(commerceOrderItems.orderId, commerceOrders.id))
    .where(and(eq(commerceOrders.id, orderId), eq(commerceOrders.userId, userId)))
    .limit(1)

  if (order === undefined) {
    return null
  }

  const [entitlement] = await getDatabase()
    .select({revokedAt: commerceEntitlementGrants.revokedAt})
    .from(commerceEntitlementGrants)
    .where(eq(commerceEntitlementGrants.orderItemId, order.itemId))
    .limit(1)

  const entitlementStatus: PaddlePaymentEntitlementStatus =
    entitlement === undefined ? 'missing' : entitlement.revokedAt === null ? 'granted' : 'revoked'

  return {
    amountMinor: order.amountMinor,
    currency: order.currency,
    entitlementStatus,
    orderId: context.orderId,
    productId: order.productId,
    providerPaymentIntentId: context.providerPaymentIntentId,
    providerSessionId: context.providerSessionId,
    status: context.status,
  }
}

export const toPaddlePaymentEvidence = (
  transaction: PaddleTransactionSnapshot,
  price: PaddlePrice,
): PaddlePaymentEvidence => {
  const {
    order_id: orderId,
    price_id: priceId,
    product_id: productId,
    user_id: userId,
  } = transaction.customData

  if (
    typeof orderId !== 'string' ||
    typeof productId !== 'string' ||
    typeof userId !== 'string' ||
    priceId !== price.id ||
    transaction.items.length !== 1 ||
    transaction.items[0]?.priceId !== price.id ||
    transaction.items[0]?.quantity !== 1
  ) {
    throw new PaddlePaymentValidationError('payment_price_mismatch')
  }

  return {
    amountMinor: price.amountMinor,
    currency: price.currency,
    orderId,
    priceId: price.id,
    productId,
    providerPaymentIntentId: null,
    providerSessionId: transaction.id,
    userId,
  }
}
