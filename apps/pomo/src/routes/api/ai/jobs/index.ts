import {invalidJsonBodyResponse} from 'src/server/http/invalid-json-body-response'
import type {APIEvent} from '@solidjs/start/server'

import {resolveUserRequestOrUnavailable} from 'src/server/auth/resolve-user-request-or-unavailable'
import {readJsonBody} from 'src/server/http/body'
import {noStoreJson} from 'src/server/http/response'
import {createAiJobRequestSchema} from 'src/server/ai/contracts'
import {createPublicJob, submitAiJob} from 'src/server/ai/service'

const MAXIMUM_BODY_SIZE = 16_000_000
const HTTP_BAD_REQUEST = 400
const HTTP_CONFLICT = 409
const HTTP_FORBIDDEN = 403
const HTTP_SERVICE_UNAVAILABLE = 503
const HTTP_UNAUTHORIZED = 401
const HTTP_TOO_MANY_REQUESTS = 429
const HTTP_ACCEPTED = 202

export const POST = async (event: APIEvent): Promise<Response> => {
  const resolved = await resolveUserRequestOrUnavailable(event.request, {
    logMessage: 'Failed to resolve AI job user',
    unavailableError: 'ai_job_unavailable',
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

  const bodyResult = await readJsonBody(event, MAXIMUM_BODY_SIZE)
  const parsedBody = createAiJobRequestSchema.safeParse(bodyResult.success ? bodyResult.body : null)
  if (!parsedBody.success) {
    return invalidJsonBodyResponse(bodyResult, {
      cookies: identity.cookies,
      error: 'invalid_request',
    })
  }

  try {
    const result = await submitAiJob(identity.userId, parsedBody.data)
    if (result.kind === 'error') {
      const status =
        result.code === 'configuration-error'
          ? HTTP_SERVICE_UNAVAILABLE
          : result.code === 'not-entitled'
            ? HTTP_FORBIDDEN
            : result.code === 'quota-exceeded' || result.code === 'queue-exceeded'
              ? HTTP_TOO_MANY_REQUESTS
              : result.code === 'idempotency-conflict'
                ? HTTP_CONFLICT
                : HTTP_BAD_REQUEST
      return noStoreJson({error: result.code}, {cookies: identity.cookies, status})
    }

    return noStoreJson(
      {created: result.created, job: createPublicJob(result.job)},
      {cookies: identity.cookies, status: HTTP_ACCEPTED},
    )
  } catch (error: unknown) {
    console.error('Failed to submit AI job', error)
    return noStoreJson(
      {error: 'ai_job_submission_failed'},
      {cookies: identity.cookies, status: HTTP_SERVICE_UNAVAILABLE},
    )
  }
}
