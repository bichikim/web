import type {APIEvent} from '@solidjs/start/server'
import {z} from 'zod'

import {authorizeAdminRequest} from 'src/server/admin-auth/http'
import {readBoundedRequest} from 'src/server/http/body'
import {noStoreJson} from 'src/server/http/response'
import {storeAlbumCover} from 'src/server/music/cover-upload'

// Stay below the hosting platform's request limit after client-side WebP conversion.
// oxlint-disable-next-line eslint/no-magic-numbers -- Prepared cover upload limit is four MiB.
const MAXIMUM_COVER_BYTES = 4 * 1024 * 1024
const HTTP_UNSUPPORTED_MEDIA_TYPE = 415
const HTTP_SERVICE_UNAVAILABLE = 503
const coverIdSchema = z.string().uuid()

export const POST = async (event: APIEvent): Promise<Response> => {
  const authorization = await authorizeAdminRequest(event.request)

  if (!authorization.authorized) {
    return authorization.response
  }

  if (event.request.headers.get('Content-Type')?.toLowerCase() !== 'image/webp') {
    return noStoreJson(
      {error: 'invalid_cover_type'},
      {cookies: authorization.cookies, status: HTTP_UNSUPPORTED_MEDIA_TYPE},
    )
  }

  const coverId = coverIdSchema.safeParse(event.request.headers.get('X-Pomo-Cover-Id'))

  if (!coverId.success) {
    return noStoreJson({error: 'invalid_cover_id'}, {cookies: authorization.cookies, status: 400})
  }

  const bodyResult = await readBoundedRequest(event, MAXIMUM_COVER_BYTES)

  if (!bodyResult.success) {
    return noStoreJson(
      {error: 'invalid_cover'},
      {cookies: authorization.cookies, status: bodyResult.status},
    )
  }

  try {
    const body = await bodyResult.request.arrayBuffer()

    if (body.byteLength === 0) {
      return noStoreJson({error: 'invalid_cover'}, {cookies: authorization.cookies, status: 400})
    }

    return noStoreJson(
      await storeAlbumCover({body, contentType: 'image/webp'}, {id: coverId.data}),
      {cookies: authorization.cookies},
    )
  } catch (error) {
    console.error('Failed to create an album cover upload', error)
    return noStoreJson(
      {error: 'cover_upload_unavailable'},
      {cookies: authorization.cookies, status: HTTP_SERVICE_UNAVAILABLE},
    )
  }
}
