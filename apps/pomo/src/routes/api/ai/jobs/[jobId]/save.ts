import {parseAiJobId} from 'src/server/ai/parse-ai-job-id'
import type {APIEvent} from '@solidjs/start/server'

import {resolveUserRequestOrUnavailable} from 'src/server/auth/resolve-user-request-or-unavailable'
import {
  createAiJobResult,
  deleteAiJobArtifactForUser,
  getAiJobStatus,
  saveAiJobArtifactForUser,
} from 'src/server/ai/service'
import {noStoreJson} from 'src/server/http/response'

const HTTP_CONFLICT = 409
const HTTP_ACCEPTED = 202
const HTTP_NOT_FOUND = 404
const HTTP_SERVICE_UNAVAILABLE = 503
const HTTP_UNAUTHORIZED = 401

export const POST = async (event: APIEvent): Promise<Response> => {
  const jobId = parseAiJobId(event.params.jobId)
  if (jobId instanceof Response) {
    return jobId
  }

  const resolved = await resolveUserRequestOrUnavailable(event.request, {
    logMessage: 'Failed to resolve AI artifact save user',
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
    const artifact = await saveAiJobArtifactForUser(jobId, identity.userId)
    if (artifact === null) {
      return noStoreJson(
        {error: 'ai_artifact_not_available'},
        {cookies: identity.cookies, status: HTTP_CONFLICT},
      )
    }

    const job = await getAiJobStatus(jobId, identity.userId)
    const result = job === null ? null : await createAiJobResult(job)
    return result === null
      ? noStoreJson(
          {error: 'ai_artifact_not_available'},
          {cookies: identity.cookies, status: HTTP_CONFLICT},
        )
      : noStoreJson({result, saved: true}, {cookies: identity.cookies})
  } catch (caught: unknown) {
    console.error('Failed to save AI artifact', caught)
    return noStoreJson(
      {error: 'ai_artifact_save_failed'},
      {cookies: identity.cookies, status: HTTP_SERVICE_UNAVAILABLE},
    )
  }
}

export const DELETE = async (event: APIEvent): Promise<Response> => {
  const jobId = parseAiJobId(event.params.jobId)
  if (jobId instanceof Response) {
    return jobId
  }

  const resolved = await resolveUserRequestOrUnavailable(event.request, {
    logMessage: 'Failed to resolve AI artifact delete user',
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
    const artifact = await deleteAiJobArtifactForUser(jobId, identity.userId)
    if (artifact === null) {
      return noStoreJson(
        {error: 'ai_artifact_not_found'},
        {cookies: identity.cookies, status: HTTP_NOT_FOUND},
      )
    }

    return artifact.lifecycle === 'deleted'
      ? noStoreJson({deleted: true}, {cookies: identity.cookies})
      : noStoreJson(
          {deleted: false, deletionPending: true},
          {cookies: identity.cookies, status: HTTP_ACCEPTED},
        )
  } catch (caught: unknown) {
    console.error('Failed to delete AI artifact', caught)
    return noStoreJson(
      {error: 'ai_artifact_delete_failed'},
      {cookies: identity.cookies, status: HTTP_SERVICE_UNAVAILABLE},
    )
  }
}
