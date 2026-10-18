import type {APIEvent} from '@solidjs/start/server'
import {adminCloudTextQuerySchema} from 'src/features/admin-cloud-text/contracts'
import {authorizeAdminRequest} from 'src/server/auth/authorize-admin-request'
import {listAdminCloudTextUsers} from 'src/server/cloud-text/admin/list-users'
import {noStoreJson} from 'src/server/http/response'

const HTTP_BAD_REQUEST = 400
const HTTP_SERVICE_UNAVAILABLE = 503

export const GET = async (event: APIEvent): Promise<Response> => {
  const authorization = await authorizeAdminRequest(event.request)
  if (!authorization.authorized) {
    return authorization.response
  }
  const query = adminCloudTextQuerySchema.safeParse(
    Object.fromEntries(new URL(event.request.url).searchParams),
  )
  if (!query.success) {
    return noStoreJson(
      {error: 'invalid_request'},
      {cookies: authorization.cookies, status: HTTP_BAD_REQUEST},
    )
  }
  try {
    return noStoreJson(await listAdminCloudTextUsers(query.data), {cookies: authorization.cookies})
  } catch (error: unknown) {
    console.error('Failed to list cloud text limits', error)
    return noStoreJson(
      {error: 'cloud_text_limits_unavailable'},
      {cookies: authorization.cookies, status: HTTP_SERVICE_UNAVAILABLE},
    )
  }
}
