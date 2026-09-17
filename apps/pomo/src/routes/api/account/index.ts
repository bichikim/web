import type {APIEvent} from '@solidjs/start/server'

import {noStoreJson} from 'src/server/http/response'
import {getAuthSession} from 'src/server/auth/get-auth-session'
import {findOrCreateNeonUser} from 'src/server/repositories/auth'

const HTTP_UNAUTHORIZED = 401

export const GET = async (event: APIEvent): Promise<Response> => {
  const session = await getAuthSession(event.request, {provider: 'neon'})

  if (session.identity === null) {
    return noStoreJson(
      {authenticated: false},
      {cookies: session.setCookies, status: HTTP_UNAUTHORIZED},
    )
  }

  const userId = await findOrCreateNeonUser(session.identity.id)

  return noStoreJson(
    {
      authenticated: true,
      email: session.identity.email,
      userId,
    },
    {cookies: session.setCookies},
  )
}
