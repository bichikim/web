import type {APIEvent} from '@solidjs/start/server'
import {z} from 'zod'

import {authorizeAdminRequest} from 'src/server/admin-auth/http'
import {readJsonBody} from 'src/server/http/body'
import {noStoreJson} from 'src/server/http/response'
import {
  activateTrackAsset,
  failTrackAsset,
  findPendingTrackAsset,
  reserveTrackAsset,
} from 'src/server/music/admin-repository'
import {
  createTrackPreviewObject,
  createTrackUpload,
  inspectTrackUpload,
} from 'src/server/music/track-upload'

const MAXIMUM_BODY_SIZE = 1024
const HTTP_BAD_REQUEST = 400
const HTTP_NOT_FOUND = 404
const HTTP_CONFLICT = 409
const HTTP_SERVICE_UNAVAILABLE = 503
const reserveSchema = z.object({trackId: z.string().uuid()})
const completeSchema = z.object({assetId: z.string().uuid()})

export const POST = async (event: APIEvent): Promise<Response> => {
  const authorization = await authorizeAdminRequest(event.request)

  if (!authorization.authorized) {
    return authorization.response
  }

  const bodyResult = await readJsonBody(event, MAXIMUM_BODY_SIZE)
  const parsedBody = reserveSchema.safeParse(bodyResult.success ? bodyResult.body : null)

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
    const asset = await reserveTrackAsset(parsedBody.data.trackId)

    if (asset === null) {
      return noStoreJson(
        {error: 'track_not_found'},
        {cookies: authorization.cookies, status: HTTP_NOT_FOUND},
      )
    }

    return noStoreJson(
      {assetId: asset.assetId, ...(await createTrackUpload(asset.objectKey))},
      {cookies: authorization.cookies},
    )
  } catch (error) {
    console.error('Failed to reserve a music track asset', error)
    return noStoreJson(
      {error: 'track_upload_unavailable'},
      {cookies: authorization.cookies, status: HTTP_SERVICE_UNAVAILABLE},
    )
  }
}

export const PUT = async (event: APIEvent): Promise<Response> => {
  const authorization = await authorizeAdminRequest(event.request)

  if (!authorization.authorized) {
    return authorization.response
  }

  const bodyResult = await readJsonBody(event, MAXIMUM_BODY_SIZE)
  const parsedBody = completeSchema.safeParse(bodyResult.success ? bodyResult.body : null)

  if (!parsedBody.success) {
    return noStoreJson(
      {error: 'invalid_request'},
      {
        cookies: authorization.cookies,
        status: bodyResult.success ? HTTP_BAD_REQUEST : bodyResult.status,
      },
    )
  }

  const asset = await findPendingTrackAsset(parsedBody.data.assetId)

  if (asset === null) {
    return noStoreJson(
      {error: 'asset_not_found'},
      {cookies: authorization.cookies, status: HTTP_NOT_FOUND},
    )
  }

  try {
    const inspection = await inspectTrackUpload(asset.objectKey)
    await createTrackPreviewObject(asset.objectKey, inspection.durationMs)
    const activated = await activateTrackAsset({assetId: asset.id, ...inspection})

    return activated
      ? noStoreJson({assetId: asset.id, status: 'active'}, {cookies: authorization.cookies})
      : noStoreJson(
          {error: 'asset_state_conflict'},
          {cookies: authorization.cookies, status: HTTP_CONFLICT},
        )
  } catch (error) {
    console.error('Failed to validate a music track asset', error)

    if (!(error instanceof TypeError)) {
      return noStoreJson(
        {error: 'track_validation_unavailable'},
        {cookies: authorization.cookies, status: HTTP_SERVICE_UNAVAILABLE},
      )
    }

    await failTrackAsset(asset.id, error.message)
    return noStoreJson(
      {error: 'invalid_mp3'},
      {cookies: authorization.cookies, status: HTTP_BAD_REQUEST},
    )
  }
}
