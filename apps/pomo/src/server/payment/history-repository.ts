import {desc, eq} from 'drizzle-orm'

import {
  commerceEntitlementGrants,
  commerceOrderItems,
  commerceOrders,
  getDatabase,
} from '../database'
import type {
  PaddlePaymentEntitlementStatus,
  PaddlePaymentOrderStatusView,
} from './completion-repository'

export interface PaymentOrderHistoryView extends PaddlePaymentOrderStatusView {
  readonly createdAt: Date
  readonly fractionalDigits: number
  readonly paidAt: Date | null
  readonly refundedAt: Date | null
  readonly receiptUrl: string | null
}

export const listPaymentOrderHistory = async (
  userId: string,
): Promise<readonly PaymentOrderHistoryView[]> => {
  const orders = await getDatabase()
    .select({
      amountMinor: commerceOrders.amountMinor,
      createdAt: commerceOrders.createdAt,
      currency: commerceOrders.currency,
      entitlementId: commerceEntitlementGrants.id,
      entitlementRevokedAt: commerceEntitlementGrants.revokedAt,
      fractionalDigits: commerceOrders.fractionalDigits,
      orderId: commerceOrders.id,
      paidAt: commerceOrders.paidAt,
      productId: commerceOrderItems.productId,
      providerPaymentIntentId: commerceOrders.providerPaymentIntentId,
      providerSessionId: commerceOrders.providerSessionId,
      refundedAt: commerceOrders.refundedAt,
      status: commerceOrders.status,
    })
    .from(commerceOrders)
    .innerJoin(commerceOrderItems, eq(commerceOrderItems.orderId, commerceOrders.id))
    .leftJoin(
      commerceEntitlementGrants,
      eq(commerceEntitlementGrants.orderItemId, commerceOrderItems.id),
    )
    .where(eq(commerceOrders.userId, userId))
    .orderBy(desc(commerceOrders.createdAt))

  return orders.map((order) => ({
    amountMinor: order.amountMinor,
    createdAt: order.createdAt,
    currency: order.currency,
    entitlementStatus: getEntitlementStatus(order.entitlementId, order.entitlementRevokedAt),
    fractionalDigits: order.fractionalDigits,
    orderId: order.orderId,
    paidAt: order.paidAt,
    productId: order.productId,
    providerPaymentIntentId: order.providerPaymentIntentId,
    providerSessionId: order.providerSessionId,
    receiptUrl: null,
    refundedAt: order.refundedAt,
    status: order.status,
  }))
}

const getEntitlementStatus = (
  id: string | null,
  revokedAt: Date | null,
): PaddlePaymentEntitlementStatus =>
  id === null ? 'missing' : revokedAt === null ? 'granted' : 'revoked'
