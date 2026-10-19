import type {APIEvent} from '@solidjs/start/server'
import {z} from 'zod'
import {authorizeAdminRequest} from 'src/server/auth/authorize-admin-request'
import {listAdminCloudTextUsers} from 'src/server/cloud-text/admin/list-users'
import {resetUserCloudTextUsage} from 'src/server/cloud-text/admin/reset-usage'
import {noStoreJson} from 'src/server/http/response'

const HTTP_BAD_REQUEST = 400
const HTTP_NOT_FOUND = 404
const HTTP_SERVICE_UNAVAILABLE = 503

export const POST = async (event: APIEvent): Promise<Response> => {
  const authorization = await authorizeAdminRequest(event.request)
  if (!authorization.authorized) {
    return authorization.response
  }
  const userId = z.uuid().safeParse(event.params.userId)
  if (!userId.success) {
    return noStoreJson(
      {error: 'invalid_request'},
      {cookies: authorization.cookies, status: HTTP_BAD_REQUEST},
    )
  }
  try {
    const updated = await resetUserCloudTextUsage({userId: userId.data})
    if (updated) {
      const page = await listAdminCloudTextUsers({userId: userId.data})
      const [user] = page.users
      if (user !== undefined) {
        return noStoreJson(user, {cookies: authorization.cookies})
      }
    }
    return noStoreJson(
      {error: 'user_not_found'},
      {cookies: authorization.cookies, status: HTTP_NOT_FOUND},
    )
  } catch (error: unknown) {
    console.error('Failed to reset cloud text usage', error)
    return noStoreJson(
      {error: 'cloud_text_limits_unavailable'},
      {cookies: authorization.cookies, status: HTTP_SERVICE_UNAVAILABLE},
    )
  }
}
