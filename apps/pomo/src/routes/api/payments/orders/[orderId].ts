import type {APIEvent} from '@solidjs/start/server'
import {z} from 'zod'

import {isUserRequestResolutionError} from 'src/server/auth/user-request-resolution-error'
import {resolveUserRequest} from 'src/server/auth/resolve-user-request'
import {noStoreJson} from 'src/server/http/response'
import {type PaddlePaymentOrderStatusView, reconcilePaddlePaymentOrder} from 'src/server/payment'

const HTTP_BAD_REQUEST = 400
const HTTP_NOT_FOUND = 404
const HTTP_SERVICE_UNAVAILABLE = 503
const HTTP_UNAUTHORIZED = 401
const orderIdSchema = z.string().uuid()

const toPaymentOrderResponse = (status: PaddlePaymentOrderStatusView) => ({
  amountMinor: status.amountMinor.toString(),
  currency: status.currency,
  entitlementStatus: status.entitlementStatus,
  orderId: status.orderId,
  productId: status.productId,
  providerPaymentIntentId: status.providerPaymentIntentId,
  providerSessionId: status.providerSessionId,
  status: status.status,
})

export const GET = async (event: APIEvent): Promise<Response> => {
  const orderId = orderIdSchema.safeParse(event.params.orderId)

  if (!orderId.success) {
    return noStoreJson({error: 'invalid_request'}, {status: HTTP_BAD_REQUEST})
  }

  let identity: Awaited<ReturnType<typeof resolveUserRequest>>
  try {
    identity = await resolveUserRequest(event.request)
  } catch (error: unknown) {
    if (!isUserRequestResolutionError(error)) {
      throw error
    }

    console.error('Failed to resolve payment status user', error.cause)
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
    const status = await reconcilePaddlePaymentOrder(orderId.data, identity.userId)

    if (status === null) {
      return noStoreJson(
        {error: 'payment_order_not_found'},
        {cookies: identity.cookies, status: HTTP_NOT_FOUND},
      )
    }

    return noStoreJson(toPaymentOrderResponse(status), {cookies: identity.cookies})
  } catch (error: unknown) {
    console.error('Failed to reconcile payment order', error)
    return noStoreJson(
      {error: 'payment_status_unavailable'},
      {cookies: identity.cookies, status: HTTP_SERVICE_UNAVAILABLE},
    )
  }
}
