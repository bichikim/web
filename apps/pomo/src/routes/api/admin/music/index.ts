import type {APIEvent} from '@solidjs/start/server'

import {authorizeAdminRequest} from 'src/server/admin-auth/http'
import {noStoreJson} from 'src/server/http/response'
import {listAdminMusic} from 'src/server/music/admin-repository'

const HTTP_INTERNAL_SERVER_ERROR = 500

export const GET = async (event: APIEvent): Promise<Response> => {
  const authorization = await authorizeAdminRequest(event.request)

  if (!authorization.authorized) {
    return authorization.response
  }

  try {
    return noStoreJson(await listAdminMusic(), {cookies: authorization.cookies})
  } catch (error) {
    console.error('Failed to list admin music', error)
    return noStoreJson(
      {error: 'music_list_failed'},
      {cookies: authorization.cookies, status: HTTP_INTERNAL_SERVER_ERROR},
    )
  }
}
