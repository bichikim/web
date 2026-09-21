import {invalidJsonBodyResponse} from 'src/server/http/invalid-json-body-response'
import type {APIEvent} from '@solidjs/start/server'
import {z} from 'zod'

import {isUserRequestResolutionError} from 'src/server/auth/user-request-resolution-error'
import {resolveUserRequest} from 'src/server/auth/resolve-user-request'
import {readJsonBody} from 'src/server/http/body'
import {noStoreJson} from 'src/server/http/response'
import {createFeatureRequest, listFeatureRequests} from 'src/server/repositories/feature-requests'

const MAXIMUM_BODY_SIZE = 8192
const MAXIMUM_DESCRIPTION_LENGTH = 2000
const MAXIMUM_TITLE_LENGTH = 120
const HTTP_BAD_REQUEST = 400
const HTTP_CREATED = 201
const HTTP_INTERNAL_SERVER_ERROR = 500
const HTTP_UNAUTHORIZED = 401
const HTTP_SERVICE_UNAVAILABLE = 503
const MAXIMUM_LIST_OFFSET = 10_000

const createFeatureRequestSchema = z.object({
  description: z.string().trim().max(MAXIMUM_DESCRIPTION_LENGTH),
  title: z.string().trim().min(1).max(MAXIMUM_TITLE_LENGTH),
})
const listFeatureRequestQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).max(MAXIMUM_LIST_OFFSET).default(0),
})

const resolveIdentity = async (event: APIEvent) => {
  try {
    return {identity: await resolveUserRequest(event.request), response: null}
  } catch (error: unknown) {
    if (!isUserRequestResolutionError(error)) {
      throw error
    }

    console.error('Failed to resolve feature request user', error.cause)
    return {
      identity: null,
      response: noStoreJson(
        {error: 'feature_request_unavailable'},
        {cookies: error.cookies, status: HTTP_SERVICE_UNAVAILABLE},
      ),
    }
  }
}

export const GET = async (event: APIEvent): Promise<Response> => {
  const resolved = await resolveIdentity(event)

  if (resolved.response !== null) {
    return resolved.response
  }

  const parsedQuery = listFeatureRequestQuerySchema.safeParse(
    Object.fromEntries(new URL(event.request.url).searchParams),
  )

  if (!parsedQuery.success) {
    return noStoreJson(
      {error: 'invalid_request'},
      {cookies: resolved.identity.cookies, status: HTTP_BAD_REQUEST},
    )
  }

  try {
    const page = await listFeatureRequests(resolved.identity.userId, parsedQuery.data)
    return noStoreJson(page, {cookies: resolved.identity.cookies})
  } catch (error: unknown) {
    console.error('Failed to list feature requests', error)
    return noStoreJson(
      {error: 'feature_request_list_failed'},
      {cookies: resolved.identity.cookies, status: HTTP_INTERNAL_SERVER_ERROR},
    )
  }
}

export const POST = async (event: APIEvent): Promise<Response> => {
  const resolved = await resolveIdentity(event)

  if (resolved.response !== null) {
    return resolved.response
  }

  if (resolved.identity.userId === null) {
    return noStoreJson(
      {error: 'unauthorized'},
      {cookies: resolved.identity.cookies, status: HTTP_UNAUTHORIZED},
    )
  }

  const bodyResult = await readJsonBody(event, MAXIMUM_BODY_SIZE)
  const parsedBody = createFeatureRequestSchema.safeParse(
    bodyResult.success ? bodyResult.body : null,
  )

  if (!parsedBody.success) {
    return invalidJsonBodyResponse(bodyResult, {
      cookies: resolved.identity.cookies,
      error: 'invalid_request',
    })
  }

  try {
    const request = await createFeatureRequest({
      ...parsedBody.data,
      userId: resolved.identity.userId,
    })
    return noStoreJson(
      {id: request.id, status: 'created'},
      {cookies: resolved.identity.cookies, status: HTTP_CREATED},
    )
  } catch (error: unknown) {
    console.error('Failed to create a feature request', error)
    return noStoreJson(
      {error: 'feature_request_create_failed'},
      {cookies: resolved.identity.cookies, status: HTTP_INTERNAL_SERVER_ERROR},
    )
  }
}
