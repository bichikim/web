import type {APIEvent} from '@solidjs/start/server'
import {z} from 'zod'

import {isUserRequestResolutionError} from 'src/server/auth/user-request-resolution-error'
import {resolveUserRequest} from 'src/server/auth/resolve-user-request'
import {readJsonBody} from 'src/server/http/body'
import {isSameOriginRequest} from 'src/server/http/csrf'
import {noStoreJson} from 'src/server/http/response'
import {startPayment} from 'src/server/payment'
import type {PaymentRejected} from 'src/features/payment/types'

const MAXIMUM_BODY_SIZE = 4096
const HTTP_BAD_REQUEST = 400
const HTTP_CONFLICT = 409
const HTTP_FORBIDDEN = 403
const HTTP_INTERNAL_SERVER_ERROR = 500
const HTTP_SERVICE_UNAVAILABLE = 503
const HTTP_UNAUTHORIZED = 401

const startPaymentSchema = z.object({
  productId: z.string().uuid(),
  provider: z.enum(['apps-in-toss', 'paddle']).optional(),
})

const getRejectionStatus = (code: PaymentRejected['code']): number => {
  switch (code) {
    case 'already_owned':
    case 'price_changed':
      return HTTP_CONFLICT
    case 'login_required':
      return HTTP_UNAUTHORIZED
    case 'provider_unavailable':
    case 'unavailable':
      return HTTP_SERVICE_UNAVAILABLE
  }
}

const resolveIdentity = async (event: APIEvent) => {
  try {
    return {identity: await resolveUserRequest(event.request), response: null}
  } catch (error: unknown) {
    if (!isUserRequestResolutionError(error)) {
      throw error
    }

    console.error('Failed to resolve payment user', error.cause)
    return {
      identity: null,
      response: noStoreJson(
        {error: 'payment_unavailable'},
        {cookies: error.cookies, status: HTTP_SERVICE_UNAVAILABLE},
      ),
    }
  }
}

export const POST = async (event: APIEvent): Promise<Response> => {
  if (!isSameOriginRequest(event.request)) {
    return noStoreJson({error: 'csrf_failed'}, {status: HTTP_FORBIDDEN})
  }

  const resolved = await resolveIdentity(event)

  if (resolved.response !== null) {
    return resolved.response
  }

  if (resolved.identity.access === 'invalid') {
    return noStoreJson(
      {error: 'authentication_unavailable'},
      {cookies: resolved.identity.cookies, status: HTTP_SERVICE_UNAVAILABLE},
    )
  }

  if (resolved.identity.userId === null) {
    return noStoreJson(
      {error: 'unauthorized'},
      {cookies: resolved.identity.cookies, status: HTTP_UNAUTHORIZED},
    )
  }

  const bodyResult = await readJsonBody(event, MAXIMUM_BODY_SIZE)
  const parsedBody = startPaymentSchema.safeParse(bodyResult.success ? bodyResult.body : null)

  if (!parsedBody.success) {
    return noStoreJson(
      {error: 'invalid_request'},
      {
        cookies: resolved.identity.cookies,
        status: bodyResult.success ? HTTP_BAD_REQUEST : bodyResult.status,
      },
    )
  }

  try {
    const result = await startPayment(parsedBody.data, {
      publicOrigin: import.meta.env.VITE_POMO_PUBLIC_ORIGIN,
      userId: resolved.identity.userId,
    })

    if ('status' in result && result.status === 'rejected') {
      return noStoreJson(result, {
        cookies: resolved.identity.cookies,
        status: getRejectionStatus(result.code),
      })
    }

    return noStoreJson(result, {cookies: resolved.identity.cookies})
  } catch (error: unknown) {
    console.error('Failed to start payment', error)
    return noStoreJson(
      {error: 'payment_start_failed'},
      {cookies: resolved.identity.cookies, status: HTTP_INTERNAL_SERVER_ERROR},
    )
  }
}
