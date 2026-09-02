import type {APIEvent} from '@solidjs/start/server'
import {z} from 'zod'

import {readJsonBody} from 'src/server/http/body'
import {noStoreJson} from 'src/server/http/response'
import {exchangeTossAuthorization} from 'src/server/toss-auth/client'
import {createPendingTossAppSession} from 'src/server/user-auth/repository'

const MAXIMUM_BODY_SIZE = 8192
const MAX_AUTHORIZATION_CODE_LENGTH = 2048
const HTTP_BAD_REQUEST = 400
const HTTP_BAD_GATEWAY = 502
const exchangeRequestSchema = z.object({
  authorizationCode: z.string().min(1).max(MAX_AUTHORIZATION_CODE_LENGTH),
  referrer: z.enum(['DEFAULT', 'SANDBOX']),
})

const handleExchange = async (event: APIEvent): Promise<Response> => {
  const bodyResult = await readJsonBody(event, MAXIMUM_BODY_SIZE)
  const parsedRequest = exchangeRequestSchema.safeParse(bodyResult.success ? bodyResult.body : null)

  if (!parsedRequest.success) {
    return noStoreJson(
      {error: 'invalid_request'},
      {status: bodyResult.success ? HTTP_BAD_REQUEST : bodyResult.status},
    )
  }

  try {
    const identity = await exchangeTossAuthorization(parsedRequest.data)
    const session = await createPendingTossAppSession(identity.userKey)

    return noStoreJson({
      expiresAt: session.expiresAt.toISOString(),
      token: session.token,
      userId: session.userId,
    })
  } catch (error) {
    console.error('Toss login exchange failed', error)
    return noStoreJson({error: 'login_failed'}, {status: HTTP_BAD_GATEWAY})
  }
}

export const POST = handleExchange
export const PUT = handleExchange
