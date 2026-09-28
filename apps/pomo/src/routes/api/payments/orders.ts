import type {APIEvent} from '@solidjs/start/server'

import {isUserRequestResolutionError} from 'src/server/auth/user-request-resolution-error'
import {resolveUserRequest} from 'src/server/auth/resolve-user-request'
import {noStoreJson} from 'src/server/http/response'
import {listPaymentOrderHistory, type PaymentOrderHistoryView} from 'src/server/payment'

const HTTP_SERVICE_UNAVAILABLE = 503
const HTTP_UNAUTHORIZED = 401

const toPaymentOrderResponse = (order: PaymentOrderHistoryView) => ({
  amountMinor: order.amountMinor.toString(),
  createdAt: order.createdAt.toISOString(),
  currency: order.currency,
  entitlementStatus: order.entitlementStatus,
  fractionalDigits: order.fractionalDigits,
  orderId: order.orderId,
  paidAt: order.paidAt?.toISOString() ?? null,
  productId: order.productId,
  providerPaymentIntentId: order.providerPaymentIntentId,
  providerSessionId: order.providerSessionId,
  receiptUrl: order.receiptUrl,
  refundedAt: order.refundedAt?.toISOString() ?? null,
  status: order.status,
})

export const GET = async (event: APIEvent): Promise<Response> => {
  let identity: Awaited<ReturnType<typeof resolveUserRequest>>
  try {
    identity = await resolveUserRequest(event.request)
  } catch (error: unknown) {
    if (!isUserRequestResolutionError(error)) {
      throw error
    }

    console.error('Failed to resolve payment history user', error.cause)
    return noStoreJson(
      {error: 'payment_unavailable'},
      {cookies: error.cookies, status: HTTP_SERVICE_UNAVAILABLE},
    )
  }

  if (identity.access === 'invalid') {
    return noStoreJson(
      {error: 'authentication_unavailable'},
      {cookies: identity.cookies, status: HTTP_SERVICE_UNAVAILABLE},
    )
  }

  if (identity.userId === null) {
    return noStoreJson(
      {error: 'unauthorized'},
      {cookies: identity.cookies, status: HTTP_UNAUTHORIZED},
    )
  }

  try {
    const orders = await listPaymentOrderHistory(identity.userId)
    return noStoreJson({orders: orders.map(toPaymentOrderResponse)}, {cookies: identity.cookies})
  } catch (error: unknown) {
    console.error('Failed to list payment history', error)
    return noStoreJson(
      {error: 'payment_history_unavailable'},
      {cookies: identity.cookies, status: HTTP_SERVICE_UNAVAILABLE},
    )
  }
}
