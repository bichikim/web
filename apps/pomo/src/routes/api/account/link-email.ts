import type {APIEvent} from '@solidjs/start/server'
import {z} from 'zod'

import {readJsonBody} from 'src/server/http/body'
import {noStoreJson} from 'src/server/http/response'
import {authenticateAppRequest} from 'src/server/user-auth/http'
import {sendAccountLinkEmail} from 'src/server/user-auth/magic-link'
import {createAccountLinkChallenge} from 'src/server/user-auth/repository'

const MAXIMUM_BODY_SIZE = 4096
const MAX_EMAIL_LENGTH = 320
const HTTP_BAD_REQUEST = 400
const HTTP_UNAUTHORIZED = 401
const HTTP_TOO_MANY_REQUESTS = 429
const HTTP_BAD_GATEWAY = 502
const linkEmailRequestSchema = z.object({email: z.email().max(MAX_EMAIL_LENGTH)})

export const POST = async (event: APIEvent): Promise<Response> => {
  const identity = await authenticateAppRequest(event.request)

  if (identity === null) {
    return noStoreJson({error: 'unauthorized'}, {status: HTTP_UNAUTHORIZED})
  }

  const bodyResult = await readJsonBody(event, MAXIMUM_BODY_SIZE)
  const parsedRequest = linkEmailRequestSchema.safeParse(
    bodyResult.success ? bodyResult.body : null,
  )

  if (!parsedRequest.success) {
    return noStoreJson(
      {error: 'invalid_email'},
      {status: bodyResult.success ? HTTP_BAD_REQUEST : bodyResult.status},
    )
  }

  const challenge = await createAccountLinkChallenge(identity.userId, parsedRequest.data.email)

  if (challenge.status === 'rate-limited') {
    return noStoreJson(
      {error: 'rate_limited'},
      {
        headers: {'Retry-After': String(challenge.retryAfterSeconds)},
        status: HTTP_TOO_MANY_REQUESTS,
      },
    )
  }

  try {
    const wasSent = await sendAccountLinkEmail({
      challengeToken: challenge.token,
      email: parsedRequest.data.email,
      request: event.request,
    })

    if (!wasSent) {
      return noStoreJson({error: 'email_not_sent'}, {status: HTTP_BAD_GATEWAY})
    }

    return noStoreJson({expiresAt: challenge.expiresAt.toISOString()})
  } catch (error) {
    console.error('Failed to send an account link email', error)
    return noStoreJson({error: 'email_not_sent'}, {status: HTTP_BAD_GATEWAY})
  }
}
