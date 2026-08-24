import type {APIEvent} from '@solidjs/start/server'
import {z} from 'zod'

import {authorizeAdminRequest} from 'src/server/admin-auth/http'
import {noStoreJson} from 'src/server/http/response'
import {createAdminPlaybackAccess} from 'src/server/music/admin-playback-access'
import {findActiveTrackAsset} from 'src/server/music/admin-repository'

const HTTP_BAD_REQUEST = 400
const HTTP_NOT_FOUND = 404
const HTTP_SERVICE_UNAVAILABLE = 503
const trackIdSchema = z.string().uuid()

export const GET = async (event: APIEvent): Promise<Response> => {
  const authorization = await authorizeAdminRequest(event.request)

  if (!authorization.authorized) {
    return authorization.response
  }

  const parsedTrackId = trackIdSchema.safeParse(event.params.trackId)

  if (!parsedTrackId.success) {
    return noStoreJson(
      {error: 'invalid_request'},
      {cookies: authorization.cookies, status: HTTP_BAD_REQUEST},
    )
  }

  try {
    const asset = await findActiveTrackAsset(parsedTrackId.data)

    if (asset === null) {
      return noStoreJson(
        {error: 'track_not_found'},
        {cookies: authorization.cookies, status: HTTP_NOT_FOUND},
      )
    }

    const playback = await createAdminPlaybackAccess({asset})
    return noStoreJson(
      {expiresAt: playback.expiresAt.toISOString(), url: playback.url},
      {cookies: authorization.cookies},
    )
  } catch (error) {
    console.error('Failed to create admin music playback access', error)
    return noStoreJson(
      {error: 'playback_unavailable'},
      {cookies: authorization.cookies, status: HTTP_SERVICE_UNAVAILABLE},
    )
  }
}
