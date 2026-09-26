import type {APIEvent} from '@solidjs/start/server'
import {z} from 'zod'

import {resolveUserRequestOrUnavailable} from 'src/server/auth/resolve-user-request-or-unavailable'
import {noStoreJson} from 'src/server/http/response'
import {voteFeatureRequest} from 'src/server/repositories/feature-requests'

const HTTP_BAD_REQUEST = 400
const HTTP_CONFLICT = 409
const HTTP_INTERNAL_SERVER_ERROR = 500
const HTTP_NOT_FOUND = 404
const HTTP_UNAUTHORIZED = 401
const requestIdSchema = z.string().uuid()

export const POST = async (event: APIEvent): Promise<Response> => {
  const requestId = requestIdSchema.safeParse(event.params.requestId)

  if (!requestId.success) {
    return noStoreJson({error: 'invalid_request'}, {status: HTTP_BAD_REQUEST})
  }

  const resolved = await resolveUserRequestOrUnavailable(event.request, {
    logMessage: 'Failed to resolve feature request voter',
    unavailableError: 'feature_request_unavailable',
  })
  if (resolved.kind === 'unavailable') {
    return resolved.response
  }
  const {identity} = resolved

  if (identity.userId === null) {
    return noStoreJson(
      {error: 'unauthorized'},
      {cookies: identity.cookies, status: HTTP_UNAUTHORIZED},
    )
  }

  try {
    const result = await voteFeatureRequest(requestId.data, identity.userId)

    switch (result.status) {
      case 'already-voted':
      case 'voted':
        return noStoreJson(result, {cookies: identity.cookies})
      case 'closed':
        return noStoreJson(
          {error: 'feature_request_voting_closed'},
          {cookies: identity.cookies, status: HTTP_CONFLICT},
        )
      case 'not-found':
        return noStoreJson(
          {error: 'feature_request_not_found'},
          {cookies: identity.cookies, status: HTTP_NOT_FOUND},
        )
      default: {
        const exhaustiveResult: never = result
        return exhaustiveResult
      }
    }
  } catch (error: unknown) {
    console.error('Failed to vote for a feature request', error)
    return noStoreJson(
      {error: 'feature_request_vote_failed'},
      {cookies: identity.cookies, status: HTTP_INTERNAL_SERVER_ERROR},
    )
  }
}
