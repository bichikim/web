import type {APIEvent} from '@solidjs/start/server'
import {z} from 'zod'

import {authorizeAdminRequest} from 'src/server/auth/authorize-admin-request'
import {readJsonBody} from 'src/server/http/body'
import {noStoreJson} from 'src/server/http/response'
import {updateFeatureRequestStatus} from 'src/server/repositories/feature-requests'

const MAXIMUM_BODY_SIZE = 4096
const HTTP_BAD_REQUEST = 400
const HTTP_INTERNAL_SERVER_ERROR = 500
const HTTP_NOT_FOUND = 404
const HTTP_CONFLICT = 409
const requestIdSchema = z.string().uuid()
const statusSchema = z.object({
  status: z.enum(['requested', 'voting', 'confirmed', 'completed']),
  targetVoteCount: z.number().int().positive().nullable().optional(),
})

export const PATCH = async (event: APIEvent): Promise<Response> => {
  const authorization = await authorizeAdminRequest(event.request)

  if (!authorization.authorized) {
    return authorization.response
  }

  const requestId = requestIdSchema.safeParse(event.params.requestId)
  const bodyResult = await readJsonBody(event, MAXIMUM_BODY_SIZE)
  const parsedBody = statusSchema.safeParse(bodyResult.success ? bodyResult.body : null)

  if (!requestId.success || !parsedBody.success) {
    return noStoreJson(
      {error: 'invalid_request'},
      {
        cookies: authorization.cookies,
        status: bodyResult.success ? HTTP_BAD_REQUEST : bodyResult.status,
      },
    )
  }

  try {
    const result = await updateFeatureRequestStatus({
      requestId: requestId.data,
      status: parsedBody.data.status,
      targetVoteCount: parsedBody.data.targetVoteCount,
    })

    if (result.success) {
      return noStoreJson({status: 'updated'}, {cookies: authorization.cookies})
    }

    return noStoreJson(
      {error: result.code},
      {
        cookies: authorization.cookies,
        status: result.code === 'feature_request_not_found' ? HTTP_NOT_FOUND : HTTP_CONFLICT,
      },
    )
  } catch (error: unknown) {
    console.error('Failed to update a feature request status', error)
    return noStoreJson(
      {error: 'feature_request_status_update_failed'},
      {cookies: authorization.cookies, status: HTTP_INTERNAL_SERVER_ERROR},
    )
  }
}
