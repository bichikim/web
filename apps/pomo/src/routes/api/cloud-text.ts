import type {APIEvent} from '@solidjs/start/server'
import {cloudTextRequestSchema} from 'src/features/cloud-text/contracts'
import {resolveUserRequestOrUnavailable} from 'src/server/auth/resolve-user-request-or-unavailable'
import {readCloudTextUsage} from 'src/server/cloud-text/quota'
import {generateCloudText} from 'src/server/cloud-text/service'
import {noStoreJson} from 'src/server/http/response'

const HTTP_BAD_REQUEST = 400
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
      case 'pending':
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
