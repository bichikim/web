import type {APIEvent} from '@solidjs/start/server'
import {z} from 'zod'

import {authorizeAdminRequest} from 'src/server/admin-auth/http'
import {noStoreJson} from 'src/server/http/response'
import {deleteTrackRecords, findRemovableTrack} from 'src/server/music/admin-repository'
import {deleteTrackObject} from 'src/server/music/track-upload'

const HTTP_BAD_REQUEST = 400
const HTTP_NOT_FOUND = 404
const HTTP_INTERNAL_SERVER_ERROR = 500
const HTTP_SERVICE_UNAVAILABLE = 503
const trackIdSchema = z.string().uuid()

export const DELETE = async (event: APIEvent): Promise<Response> => {
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

  const track = await findRemovableTrack(parsedTrackId.data)

  if (track === null) {
    return noStoreJson(
      {error: 'track_not_found'},
      {cookies: authorization.cookies, status: HTTP_NOT_FOUND},
    )
  }

  try {
    await Promise.all(track.objectKeys.map((objectKey) => deleteTrackObject(objectKey)))
  } catch (error) {
    console.error('Failed to delete music track objects', error)
    return noStoreJson(
      {error: 'track_storage_delete_failed'},
      {cookies: authorization.cookies, status: HTTP_SERVICE_UNAVAILABLE},
    )
  }

  try {
    const deleted = await deleteTrackRecords(parsedTrackId.data)

    return deleted
      ? noStoreJson({status: 'deleted'}, {cookies: authorization.cookies})
      : noStoreJson(
          {error: 'track_not_found'},
          {cookies: authorization.cookies, status: HTTP_NOT_FOUND},
        )
  } catch (error) {
    console.error('Failed to delete music track records', error)
    return noStoreJson(
      {error: 'track_delete_failed'},
      {cookies: authorization.cookies, status: HTTP_INTERNAL_SERVER_ERROR},
    )
  }
}
