import type {APIEvent} from '@solidjs/start/server'
import {cloudTextRequestSchema} from 'src/features/cloud-text/contracts'
import {resolveUserRequestOrUnavailable} from 'src/server/auth/resolve-user-request-or-unavailable'
import {readCloudTextUsage} from 'src/server/cloud-text/quota'
import {generateCloudText} from 'src/server/cloud-text/service'
import {noStoreJson} from 'src/server/http/response'
import {z} from 'zod'
import {waitUntil} from '@vercel/functions'
import {streamCloudTextJob} from 'src/server/cloud-text/job-events'
import {readCloudTextJob} from 'src/server/cloud-text/job-status'
import {cancelCloudTextJob} from 'src/server/cloud-text/cancel-job'
import {completeApiAiJobs} from 'src/server/api-ai/service'

const HTTP_OK = 200
const HTTP_NOT_FOUND = 404
const HTTP_BAD_REQUEST = 400
const HTTP_ACCEPTED = 202
const HTTP_UNAUTHORIZED = 401
const HTTP_CONFLICT = 409
const HTTP_TOO_MANY_REQUESTS = 429
const HTTP_SERVICE_UNAVAILABLE = 503
const MAXIMUM_BODY_BYTES = 200_000

const authenticate = async (request: Request) => {
  const resolved = await resolveUserRequestOrUnavailable(request, {
    logMessage: 'Failed to resolve cloud text user',
    unavailableError: 'cloud_text_unavailable',
  })
  if (resolved.kind === 'unavailable') {
    return resolved.response
  }
  const {identity} = resolved
  if (identity.access === 'invalid') {
    return noStoreJson(
      {error: 'authentication_unavailable'},
      {cookies: identity.cookies, status: HTTP_SERVICE_UNAVAILABLE},
    )
  }
  if (identity.userId === null) {
    return noStoreJson(
      {error: 'unauthorized'},
      {cookies: identity.cookies, status: HTTP_UNAUTHORIZED},
    )
  }
  return {...identity, userId: identity.userId}
}

export const GET = async (event: APIEvent): Promise<Response> => {
  const identity = await authenticate(event.request)
  if (identity instanceof Response) {
    return identity
  }
  try {
    const requestId = new URL(event.request.url).searchParams.get('requestId')
    if (requestId !== null) {
      const parsed = z.uuid().safeParse(requestId)
      if (!parsed.success) {
        return noStoreJson(
          {error: 'invalid_request'},
          {cookies: identity.cookies, status: HTTP_BAD_REQUEST},
        )
      }
      const result = await readCloudTextJob(identity.userId, parsed.data)
      if (result !== null && new URL(event.request.url).searchParams.get('events') === 'true') {
        return streamCloudTextJob(
          identity.userId,
          parsed.data,
          event.request.signal,
          identity.cookies,
        )
      }
      return result === null
        ? noStoreJson({error: 'not_found'}, {cookies: identity.cookies, status: HTTP_NOT_FOUND})
        : noStoreJson(
            result.kind === 'complete'
              ? {text: result.text, tokenCount: result.tokenCount, usage: result.usage}
              : result,
            {
              cookies: identity.cookies,
              status:
                result.kind === 'pending'
                  ? HTTP_ACCEPTED
                  : result.kind === 'complete'
                    ? HTTP_OK
                    : HTTP_CONFLICT,
            },
          )
    }
    return noStoreJson(await readCloudTextUsage(identity.userId), {cookies: identity.cookies})
  } catch (error: unknown) {
    console.error('Failed to read cloud text usage', error)
    return noStoreJson(
      {error: 'cloud_text_unavailable'},
      {cookies: identity.cookies, status: HTTP_SERVICE_UNAVAILABLE},
    )
  }
}

export const POST = async (event: APIEvent): Promise<Response> => {
  const identity = await authenticate(event.request)
  if (identity instanceof Response) {
    return identity
  }
  let body: unknown
  try {
    const text = await event.request.text()
    if (new TextEncoder().encode(text).length > MAXIMUM_BODY_BYTES) {
      return noStoreJson(
        {error: 'invalid_request'},
        {cookies: identity.cookies, status: HTTP_BAD_REQUEST},
      )
    }
    body = JSON.parse(text)
  } catch {
    return noStoreJson(
      {error: 'invalid_request'},
      {cookies: identity.cookies, status: HTTP_BAD_REQUEST},
    )
  }
  const parsed = cloudTextRequestSchema.safeParse(body)
  if (!parsed.success) {
    return noStoreJson(
      {error: 'invalid_request'},
      {cookies: identity.cookies, status: HTTP_BAD_REQUEST},
    )
  }
  try {
    const result = await generateCloudText(identity.userId, parsed.data)
    switch (result.kind) {
      case 'accepted':
        waitUntil(completeApiAiJobs())
        return noStoreJson(
          {requestId: result.requestId, usage: result.usage},
          {cookies: identity.cookies, status: HTTP_ACCEPTED},
        )
      case 'complete':
        return noStoreJson(
          {text: result.text, tokenCount: result.tokenCount, usage: result.usage},
          {cookies: identity.cookies},
        )
      case 'exhausted':
        return noStoreJson(
          {error: 'daily_limit', usage: result.usage},
          {cookies: identity.cookies, status: HTTP_TOO_MANY_REQUESTS},
        )
      case 'queue_full':
        return noStoreJson(
          {error: 'queue_full', usage: result.usage},
          {cookies: identity.cookies, status: HTTP_TOO_MANY_REQUESTS},
        )
      case 'conflict':
      case 'failed':
        return noStoreJson(
          {error: result.kind, usage: result.usage},
          {cookies: identity.cookies, status: HTTP_CONFLICT},
        )
    }
  } catch (error: unknown) {
    console.error('Failed to generate cloud text', error)
    return noStoreJson(
      {error: 'cloud_text_unavailable'},
      {cookies: identity.cookies, status: HTTP_SERVICE_UNAVAILABLE},
    )
  }
}

export const DELETE = async (event: APIEvent): Promise<Response> => {
  const identity = await authenticate(event.request)
  if (identity instanceof Response) {
    return identity
  }
  const parsed = z.uuid().safeParse(new URL(event.request.url).searchParams.get('requestId'))
  if (!parsed.success) {
    return noStoreJson(
      {error: 'invalid_request'},
      {cookies: identity.cookies, status: HTTP_BAD_REQUEST},
    )
  }
  try {
    const found = await cancelCloudTextJob(identity.userId, parsed.data)
    waitUntil(completeApiAiJobs())
    return noStoreJson(
      {cancellationRequested: found},
      {cookies: identity.cookies, status: found ? HTTP_ACCEPTED : HTTP_NOT_FOUND},
    )
  } catch (error: unknown) {
    console.error('Failed to cancel cloud text job', error)
    return noStoreJson(
      {error: 'cloud_text_unavailable'},
      {cookies: identity.cookies, status: HTTP_SERVICE_UNAVAILABLE},
    )
  }
}
