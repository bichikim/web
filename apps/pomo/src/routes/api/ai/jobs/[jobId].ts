import type {APIEvent} from '@solidjs/start/server'
import {z} from 'zod'

import {isUserRequestResolutionError} from 'src/server/auth/user-request-resolution-error'
import {resolveUserRequest} from 'src/server/auth/resolve-user-request'
import {createPublicJob, getAiJobStatus} from 'src/server/ai/service'
import {noStoreJson} from 'src/server/http/response'

const HTTP_BAD_REQUEST = 400
const HTTP_NOT_FOUND = 404
const HTTP_SERVICE_UNAVAILABLE = 503
const HTTP_UNAUTHORIZED = 401
const jobIdSchema = z.uuid()

export const GET = async (event: APIEvent): Promise<Response> => {
  const parsedJobId = jobIdSchema.safeParse(event.params.jobId)
  if (!parsedJobId.success) {
    return noStoreJson({error: 'invalid_request'}, {status: HTTP_BAD_REQUEST})
  }

  let identity: Awaited<ReturnType<typeof resolveUserRequest>>
  try {
    identity = await resolveUserRequest(event.request)
  } catch (error: unknown) {
    if (!isUserRequestResolutionError(error)) {
      throw error
    }

    console.error('Failed to resolve AI job status user', error.cause)
    return noStoreJson(
      {error: 'ai_job_unavailable'},
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
    const job = await getAiJobStatus(parsedJobId.data, identity.userId)
    return job === null
      ? noStoreJson(
          {error: 'ai_job_not_found'},
          {cookies: identity.cookies, status: HTTP_NOT_FOUND},
        )
      : noStoreJson({job: createPublicJob(job)}, {cookies: identity.cookies})
  } catch (error: unknown) {
    console.error('Failed to read AI job status', error)
    return noStoreJson(
      {error: 'ai_job_status_failed'},
      {cookies: identity.cookies, status: HTTP_SERVICE_UNAVAILABLE},
    )
  }
}
