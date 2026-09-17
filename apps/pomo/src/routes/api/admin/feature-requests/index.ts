import type {APIEvent} from '@solidjs/start/server'
import {z} from 'zod'

import {authorizeAdminRequest} from 'src/server/auth/authorize-admin-request'
import {noStoreJson} from 'src/server/http/response'
import {listAdminFeatureRequests} from 'src/server/repositories/feature-requests'

const HTTP_INTERNAL_SERVER_ERROR = 500
const HTTP_BAD_REQUEST = 400
const MAXIMUM_LIST_OFFSET = 10_000
const listFeatureRequestQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).max(MAXIMUM_LIST_OFFSET).default(0),
})

export const GET = async (event: APIEvent): Promise<Response> => {
  const authorization = await authorizeAdminRequest(event.request)

  if (!authorization.authorized) {
    return authorization.response
  }

  const parsedQuery = listFeatureRequestQuerySchema.safeParse(
    Object.fromEntries(new URL(event.request.url).searchParams),
  )

  if (!parsedQuery.success) {
    return noStoreJson(
      {error: 'invalid_request'},
      {cookies: authorization.cookies, status: HTTP_BAD_REQUEST},
    )
  }

  try {
    const page = await listAdminFeatureRequests(parsedQuery.data)
    return noStoreJson(page, {cookies: authorization.cookies})
  } catch (error: unknown) {
    console.error('Failed to list admin feature requests', error)
    return noStoreJson(
      {error: 'feature_request_list_failed'},
      {cookies: authorization.cookies, status: HTTP_INTERNAL_SERVER_ERROR},
    )
  }
}
