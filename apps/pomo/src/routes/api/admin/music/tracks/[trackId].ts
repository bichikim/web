import type {APIEvent} from '@solidjs/start/server'
import {z} from 'zod'

import {authorizeAdminRequest} from 'src/server/admin-auth/http'
import {noStoreJson} from 'src/server/http/response'
import {
  finalizeTrackDeletion,
  markTrackDeletionStorageDeleted,
  prepareTrackDeletion,
} from 'src/server/music/track-deletion-repository'
import {deleteTrackAssetStorage} from 'src/server/music/track-storage-deletion'

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

  let track: Awaited<ReturnType<typeof prepareTrackDeletion>>

  try {
    track = await prepareTrackDeletion(parsedTrackId.data)
  } catch (error) {
    console.error('Failed to prepare music track deletion', error)
    return noStoreJson(
      {error: 'track_delete_failed'},
      {cookies: authorization.cookies, status: HTTP_INTERNAL_SERVER_ERROR},
    )
  }

  if (track === null) {
    return noStoreJson(
      {error: 'track_not_found'},
      {cookies: authorization.cookies, status: HTTP_NOT_FOUND},
    )
  }

  try {
    if (!track.storageDeleted) {
      await Promise.all(track.objectKeys.map((objectKey) => deleteTrackAssetStorage(objectKey)))

      if (!(await markTrackDeletionStorageDeleted(parsedTrackId.data))) {
        throw new Error('Failed to record deleted music track objects')
      }
    }
  } catch (error) {
    console.error('Failed to delete music track objects', error)
    return noStoreJson(
      {error: 'track_storage_delete_failed'},
      {cookies: authorization.cookies, status: HTTP_SERVICE_UNAVAILABLE},
    )
  }

  try {
    const deleted = await finalizeTrackDeletion(parsedTrackId.data)

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
