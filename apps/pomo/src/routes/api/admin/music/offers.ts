import type {APIEvent} from '@solidjs/start/server'
import {z} from 'zod'

import {authorizeAdminRequest} from 'src/server/admin-auth/http'
import {readJsonBody} from 'src/server/http/body'
import {noStoreJson} from 'src/server/http/response'
import {connectAlbumOffer} from 'src/server/music/admin-repository'

const MAXIMUM_BODY_SIZE = 8192
const MAXIMUM_IDENTIFIER_LENGTH = 255
const HTTP_BAD_REQUEST = 400
const HTTP_CONFLICT = 409
const HTTP_INTERNAL_SERVER_ERROR = 500
const HTTP_NOT_FOUND = 404
const offerSchema = z.object({
  albumId: z.string().uuid(),
  externalProductId: z.string().trim().min(1).max(MAXIMUM_IDENTIFIER_LENGTH),
  provider: z.literal('apps-in-toss'),
})

export const POST = async (event: APIEvent): Promise<Response> => {
  const authorization = await authorizeAdminRequest(event.request)

  if (!authorization.authorized) {
    return authorization.response
  }

  const bodyResult = await readJsonBody(event, MAXIMUM_BODY_SIZE)
  const parsedBody = offerSchema.safeParse(bodyResult.success ? bodyResult.body : null)

  if (!parsedBody.success) {
    return noStoreJson(
      {error: 'invalid_request'},
      {
        cookies: authorization.cookies,
        status: bodyResult.success ? HTTP_BAD_REQUEST : bodyResult.status,
      },
    )
  }

  try {
    const result = await connectAlbumOffer(parsedBody.data)

    if (result.success) {
      return noStoreJson(result, {cookies: authorization.cookies})
    }

    return noStoreJson(result, {
      cookies: authorization.cookies,
      status: result.code === 'album_not_found' ? HTTP_NOT_FOUND : HTTP_CONFLICT,
    })
  } catch (error) {
    console.error('Failed to connect a commerce offer to an album', error)
    return noStoreJson(
      {error: 'offer_connection_failed'},
      {cookies: authorization.cookies, status: HTTP_INTERNAL_SERVER_ERROR},
    )
  }
}
