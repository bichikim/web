import type {APIEvent} from '@solidjs/start/server'
import {z} from 'zod'

import {noStoreJson} from 'src/server/http/response'
import {
  findEntitledTrackPlaybackAsset,
  findPublishedTrackPreviewAsset,
} from 'src/server/repositories/music-catalog'
import {createPlaybackAccess} from 'src/server/music/playback-access'
import {createPreviewAccess} from 'src/server/music/preview-access'
import {resolveUserRequest} from 'src/server/auth/resolve-user-request'

const HTTP_BAD_REQUEST = 400
const HTTP_NOT_FOUND = 404
const HTTP_UNAUTHORIZED = 401
const HTTP_SERVICE_UNAVAILABLE = 503
const trackIdSchema = z.string().uuid()

export const GET = async (event: APIEvent): Promise<Response> => {
  const parsedTrackId = trackIdSchema.safeParse(event.params.trackId)

  if (!parsedTrackId.success) {
    return noStoreJson({error: 'invalid_track_id'}, {status: HTTP_BAD_REQUEST})
  }

  try {
    const identity = await resolveUserRequest(event.request)

    if (identity.userId === null) {
      return noStoreJson(
        {error: 'unauthorized'},
        {cookies: identity.cookies, status: HTTP_UNAUTHORIZED},
      )
    }

    const entitledAsset = await findEntitledTrackPlaybackAsset(identity.userId, parsedTrackId.data)

    if (entitledAsset !== null) {
      const access = await createPlaybackAccess({asset: entitledAsset})
      return noStoreJson(
        {expiresAt: access.expiresAt.toISOString(), mode: 'full', url: access.url},
        {cookies: identity.cookies},
      )
    }

    const previewAsset = await findPublishedTrackPreviewAsset(parsedTrackId.data)

    if (previewAsset === null) {
      return noStoreJson(
        {error: 'track_not_found'},
        {cookies: identity.cookies, status: HTTP_NOT_FOUND},
      )
    }

    const access = await createPreviewAccess({asset: previewAsset, trackId: parsedTrackId.data})
    return noStoreJson({mode: 'preview', url: access.url}, {cookies: identity.cookies})
  } catch (error) {
    console.error('Failed to resolve music track access', error)
    return noStoreJson({error: 'track_access_unavailable'}, {status: HTTP_SERVICE_UNAVAILABLE})
  }
}
