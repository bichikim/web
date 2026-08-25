import type {APIEvent} from '@solidjs/start/server'
import {z} from 'zod'

import {authorizeAdminRequest} from 'src/server/admin-auth/http'
import {readJsonBody} from 'src/server/http/body'
import {noStoreJson} from 'src/server/http/response'
import {createPendingTrack} from 'src/server/music/track-registration-repository'

const MAXIMUM_BODY_SIZE = 8192
const MAXIMUM_TEXT_LENGTH = 120
const HTTP_BAD_REQUEST = 400
const HTTP_CREATED = 201
const HTTP_NOT_FOUND = 404
const HTTP_INTERNAL_SERVER_ERROR = 500
const trackSchema = z.object({
  albumId: z.string().uuid(),
  artist: z.string().trim().min(1).max(MAXIMUM_TEXT_LENGTH),
  title: z.string().trim().min(1).max(MAXIMUM_TEXT_LENGTH),
})

export const POST = async (event: APIEvent): Promise<Response> => {
  const authorization = await authorizeAdminRequest(event.request)

  if (!authorization.authorized) {
    return authorization.response
  }

  const bodyResult = await readJsonBody(event, MAXIMUM_BODY_SIZE)
  const parsedBody = trackSchema.safeParse(bodyResult.success ? bodyResult.body : null)

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
    const track = await createPendingTrack(parsedBody.data)

    return track === null
      ? noStoreJson(
          {error: 'album_not_found'},
          {cookies: authorization.cookies, status: HTTP_NOT_FOUND},
        )
      : noStoreJson(track, {cookies: authorization.cookies, status: HTTP_CREATED})
  } catch (error) {
    console.error('Failed to create a music track', error)
    return noStoreJson(
      {error: 'track_create_failed'},
      {cookies: authorization.cookies, status: HTTP_INTERNAL_SERVER_ERROR},
    )
  }
}
