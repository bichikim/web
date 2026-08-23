import type {APIEvent} from '@solidjs/start/server'
import {z} from 'zod'

import {readJsonBody} from 'src/server/http/body'
import {noStoreJson} from 'src/server/http/response'
import {getNeonSession} from 'src/server/user-auth/neon-session'
import {completeAccountLink} from 'src/server/user-auth/repository'

const MAXIMUM_BODY_SIZE = 4096
const MINIMUM_TOKEN_LENGTH = 32
const MAXIMUM_TOKEN_LENGTH = 512
const HTTP_BAD_REQUEST = 400
const HTTP_UNAUTHORIZED = 401
const HTTP_CONFLICT = 409
const HTTP_GONE = 410
const completeLinkRequestSchema = z.object({
  token: z.string().min(MINIMUM_TOKEN_LENGTH).max(MAXIMUM_TOKEN_LENGTH),
})

export const POST = async (event: APIEvent): Promise<Response> => {
  const bodyResult = await readJsonBody(event, MAXIMUM_BODY_SIZE)
  const parsedRequest = completeLinkRequestSchema.safeParse(
    bodyResult.success ? bodyResult.body : null,
  )

  if (!parsedRequest.success) {
    return noStoreJson(
      {error: 'invalid_challenge'},
      {status: bodyResult.success ? HTTP_BAD_REQUEST : bodyResult.status},
    )
  }

  const session = await getNeonSession(event.request)

  if (session.identity === null) {
    return noStoreJson(
      {error: 'unauthorized'},
      {cookies: session.cookies, status: HTTP_UNAUTHORIZED},
    )
  }

  const result = await completeAccountLink(
    parsedRequest.data.token,
    session.identity.id,
    session.identity.email,
  )

  switch (result.status) {
    case 'linked': {
      return noStoreJson({linked: true, userId: result.userId}, {cookies: session.cookies})
    }
    case 'identity-conflict': {
      return noStoreJson(
        {error: 'identity_conflict'},
        {cookies: session.cookies, status: HTTP_CONFLICT},
      )
    }
    case 'invalid-challenge': {
      return noStoreJson(
        {error: 'invalid_challenge'},
        {cookies: session.cookies, status: HTTP_GONE},
      )
    }
    default: {
      const exhaustiveResult: never = result
      return exhaustiveResult
    }
  }
}
