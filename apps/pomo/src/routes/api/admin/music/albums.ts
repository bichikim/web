import type {APIEvent} from '@solidjs/start/server'
import {z} from 'zod'

import {authorizeAdminRequest} from 'src/server/admin-auth/http'
import {readJsonBody} from 'src/server/http/body'
import {noStoreJson} from 'src/server/http/response'
import {createAlbum} from 'src/server/music/admin-repository'
import {isManagedAlbumCoverUrl} from 'src/server/music/cover-upload'

const MAXIMUM_BODY_SIZE = 65_536
const MAXIMUM_DESCRIPTION_LENGTH = 2000
const MAXIMUM_TITLE_LENGTH = 120
const REQUIRED_TRANSLATION_COUNT = 4
const HTTP_BAD_REQUEST = 400
const HTTP_CREATED = 201
const HTTP_INTERNAL_SERVER_ERROR = 500
const translationSchema = z.object({
  description: z.string().trim().max(MAXIMUM_DESCRIPTION_LENGTH),
  locale: z.enum(['ko', 'en', 'ja', 'zh-Hans']),
  title: z.string().trim().max(MAXIMUM_TITLE_LENGTH),
})
const albumSchema = z.object({
  coverDraftId: z.string().uuid().nullable().default(null),
  coverFallback: z.enum(['lp', 'cd', 'music']),
  coverImageUrl: z.string().url().startsWith('https://').nullable(),
  coverReservationId: z.string().uuid().nullable().default(null),
  translations: z
    .array(translationSchema)
    .min(1)
    .max(REQUIRED_TRANSLATION_COUNT)
    .refine(
      (translations) =>
        new Set(translations.map(({locale}) => locale)).size === translations.length,
    )
    .refine((translations) =>
      translations.some(
        (translation) =>
          translation.locale === 'ko' &&
          translation.title.length > 0 &&
          translation.description.length > 0,
      ),
    ),
})

export const POST = async (event: APIEvent): Promise<Response> => {
  const authorization = await authorizeAdminRequest(event.request)

  if (!authorization.authorized) {
    return authorization.response
  }

  const bodyResult = await readJsonBody(event, MAXIMUM_BODY_SIZE)
  const parsedBody = albumSchema.safeParse(bodyResult.success ? bodyResult.body : null)

  if (!parsedBody.success) {
    return noStoreJson(
      {error: 'invalid_request'},
      {
        cookies: authorization.cookies,
        status: bodyResult.success ? HTTP_BAD_REQUEST : bodyResult.status,
      },
    )
  }

  if (
    parsedBody.data.coverReservationId === null &&
    parsedBody.data.coverImageUrl !== null &&
    isManagedAlbumCoverUrl(parsedBody.data.coverImageUrl)
  ) {
    return noStoreJson(
      {error: 'cover_reservation_invalid'},
      {cookies: authorization.cookies, status: HTTP_BAD_REQUEST},
    )
  }

  try {
    const result = await createAlbum(parsedBody.data)

    if (!result.success) {
      return noStoreJson(
        {error: result.code},
        {cookies: authorization.cookies, status: HTTP_BAD_REQUEST},
      )
    }

    return noStoreJson(result.album, {
      cookies: authorization.cookies,
      status: HTTP_CREATED,
    })
  } catch (error) {
    console.error('Failed to create a music album', error)
    return noStoreJson(
      {error: 'album_create_failed'},
      {cookies: authorization.cookies, status: HTTP_INTERNAL_SERVER_ERROR},
    )
  }
}
