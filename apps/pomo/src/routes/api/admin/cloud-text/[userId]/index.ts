import type {APIEvent} from '@solidjs/start/server'
import {z} from 'zod'
import {cloudTextLimitUpdateSchema} from 'src/features/admin-cloud-text/contracts'
import {authorizeAdminRequest} from 'src/server/auth/authorize-admin-request'
import {listAdminCloudTextUsers} from 'src/server/cloud-text/admin/list-users'
import {updateUserCloudTextLimit} from 'src/server/cloud-text/admin/update-limit'
import {readJsonBody} from 'src/server/http/body'
import {invalidJsonBodyResponse} from 'src/server/http/invalid-json-body-response'
import {noStoreJson} from 'src/server/http/response'

const MAXIMUM_BODY_BYTES = 4096
const HTTP_NOT_FOUND = 404
const HTTP_SERVICE_UNAVAILABLE = 503

export const PATCH = async (event: APIEvent): Promise<Response> => {
  const authorization = await authorizeAdminRequest(event.request)
  if (!authorization.authorized) {
    return authorization.response
  }
  const userId = z.uuid().safeParse(event.params.userId)
  const body = await readJsonBody(event, MAXIMUM_BODY_BYTES)
  const update = cloudTextLimitUpdateSchema.safeParse(body.success ? body.body : null)
  if (!userId.success || !update.success) {
    return invalidJsonBodyResponse(body, {cookies: authorization.cookies, error: 'invalid_request'})
  }
  try {
    const updated = await updateUserCloudTextLimit({...update.data, userId: userId.data})
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
    console.error('Failed to update a cloud text limit', error)
    return noStoreJson(
      {error: 'cloud_text_limits_unavailable'},
      {cookies: authorization.cookies, status: HTTP_SERVICE_UNAVAILABLE},
    )
  }
}
