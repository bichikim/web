import type {APIEvent} from '@solidjs/start/server'

import {noStoreJson} from 'src/server/http/response'
import {getNeonSession} from 'src/server/user-auth/neon-session'
import {findOrCreateNeonUser} from 'src/server/user-auth/repository'

const HTTP_UNAUTHORIZED = 401

export const GET = async (event: APIEvent): Promise<Response> => {
  const session = await getNeonSession(event.request)

  if (session.identity === null) {
    return noStoreJson(
      {authenticated: false},
      {cookies: session.cookies, status: HTTP_UNAUTHORIZED},
    )
  }

  const userId = await findOrCreateNeonUser(session.identity.id)

  return noStoreJson(
    {
      authenticated: true,
      email: session.identity.email,
      userId,
    },
    {cookies: session.cookies},
  )
}
