import {parseAiJobId} from 'src/server/ai/parse-ai-job-id'
import type {APIEvent} from '@solidjs/start/server'

import {resolveUserRequestOrUnavailable} from 'src/server/auth/resolve-user-request-or-unavailable'
import {createAiJobResult, createPublicJob, getAiJobStatus} from 'src/server/ai/service'
import {noStoreJson} from 'src/server/http/response'

const HTTP_CONFLICT = 409
const HTTP_NOT_FOUND = 404
const HTTP_SERVICE_UNAVAILABLE = 503
const HTTP_UNAUTHORIZED = 401

export const GET = async (event: APIEvent): Promise<Response> => {
  const jobId = parseAiJobId(event.params.jobId)
  if (jobId instanceof Response) {
    return jobId
  }

  const resolved = await resolveUserRequestOrUnavailable(event.request, {
    logMessage: 'Failed to resolve AI job result user',
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

  try {
    const job = await getAiJobStatus(jobId, identity.userId)
    if (job === null) {
      return noStoreJson(
        {error: 'ai_job_not_found'},
        {cookies: identity.cookies, status: HTTP_NOT_FOUND},
      )
    }
    if (job.status !== 'succeeded') {
      return noStoreJson(
        {error: 'ai_job_not_ready', job: createPublicJob(job)},
        {cookies: identity.cookies, status: HTTP_CONFLICT},
      )
    }

    const result = await createAiJobResult(job)
    return result === null
      ? noStoreJson(
          {error: 'ai_artifact_not_available'},
          {cookies: identity.cookies, status: HTTP_NOT_FOUND},
        )
      : noStoreJson({result}, {cookies: identity.cookies})
  } catch (error: unknown) {
    console.error('Failed to read AI job result', error)
    return noStoreJson(
      {error: 'ai_job_result_failed'},
      {cookies: identity.cookies, status: HTTP_SERVICE_UNAVAILABLE},
    )
  }
}
