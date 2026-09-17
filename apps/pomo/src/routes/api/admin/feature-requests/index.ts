import type {APIEvent} from '@solidjs/start/server'

import {authorizeAdminRequest} from 'src/server/auth/authorize-admin-request'
import {noStoreJson} from 'src/server/http/response'
import {listAdminFeatureRequests} from 'src/server/repositories/feature-requests'

const HTTP_INTERNAL_SERVER_ERROR = 500

export const GET = async (event: APIEvent): Promise<Response> => {
  const authorization = await authorizeAdminRequest(event.request)

  if (!authorization.authorized) {
    return authorization.response
  }

  try {
    return noStoreJson(
      {requests: await listAdminFeatureRequests()},
      {cookies: authorization.cookies},
    )
  } catch (error: unknown) {
    console.error('Failed to list admin feature requests', error)
    return noStoreJson(
      {error: 'feature_request_list_failed'},
      {cookies: authorization.cookies, status: HTTP_INTERNAL_SERVER_ERROR},
    )
  }
}
