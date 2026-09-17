import type {APIEvent} from '@solidjs/start/server'
import {z} from 'zod'

import {isUserRequestResolutionError} from 'src/server/auth/user-request-resolution-error'
import {resolveUserRequest} from 'src/server/auth/resolve-user-request'
import {noStoreJson} from 'src/server/http/response'
import {voteFeatureRequest} from 'src/server/repositories/feature-requests'

const HTTP_BAD_REQUEST = 400
const HTTP_CONFLICT = 409
const HTTP_INTERNAL_SERVER_ERROR = 500
const HTTP_NOT_FOUND = 404
const HTTP_SERVICE_UNAVAILABLE = 503
const HTTP_UNAUTHORIZED = 401
const requestIdSchema = z.string().uuid()

export const POST = async (event: APIEvent): Promise<Response> => {
  const requestId = requestIdSchema.safeParse(event.params.requestId)

  if (!requestId.success) {
    return noStoreJson({error: 'invalid_request'}, {status: HTTP_BAD_REQUEST})
  }

  let identity: Awaited<ReturnType<typeof resolveUserRequest>>
  try {
    identity = await resolveUserRequest(event.request)
  } catch (error: unknown) {
    if (!isUserRequestResolutionError(error)) {
      throw error
    }

    console.error('Failed to resolve feature request voter', error.cause)
    return noStoreJson(
      {error: 'feature_request_unavailable'},
      {cookies: error.cookies, status: HTTP_SERVICE_UNAVAILABLE},
    )
  }

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
