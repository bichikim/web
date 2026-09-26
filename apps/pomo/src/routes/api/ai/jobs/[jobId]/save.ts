import type {APIEvent} from '@solidjs/start/server'
import {z} from 'zod'

import {isUserRequestResolutionError} from 'src/server/auth/user-request-resolution-error'
import {resolveUserRequest} from 'src/server/auth/resolve-user-request'
import {
  createAiJobResult,
  deleteAiJobArtifactForUser,
  getAiJobStatus,
  saveAiJobArtifactForUser,
} from 'src/server/ai/service'
import {noStoreJson} from 'src/server/http/response'

const HTTP_BAD_REQUEST = 400
const HTTP_CONFLICT = 409
const HTTP_ACCEPTED = 202
const HTTP_NOT_FOUND = 404
const HTTP_SERVICE_UNAVAILABLE = 503
const HTTP_UNAUTHORIZED = 401
const jobIdSchema = z.uuid()

const resolveIdentity = async (event: APIEvent) => {
  try {
    return {error: null, identity: await resolveUserRequest(event.request)}
  } catch (error: unknown) {
    if (!isUserRequestResolutionError(error)) {
      throw error
    }

    return {error, identity: null}
  }
}

const parseJobId = (event: APIEvent): string | Response => {
  const parsed = jobIdSchema.safeParse(event.params.jobId)
  return parsed.success
    ? parsed.data
    : noStoreJson({error: 'invalid_request'}, {status: HTTP_BAD_REQUEST})
}

export const POST = async (event: APIEvent): Promise<Response> => {
  const jobId = parseJobId(event)
  if (jobId instanceof Response) {
    return jobId
  }

  const {error, identity} = await resolveIdentity(event)
  if (error !== null) {
    console.error('Failed to resolve AI artifact save user', error.cause)
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
  const jobId = parseJobId(event)
  if (jobId instanceof Response) {
    return jobId
  }

  const {error, identity} = await resolveIdentity(event)
  if (error !== null) {
    console.error('Failed to resolve AI artifact delete user', error.cause)
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
