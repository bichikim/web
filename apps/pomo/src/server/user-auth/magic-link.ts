import 'server-only'

import {handleAuthProxyRequest} from '@neondatabase/auth/server'

import {getNeonAuthProxyConfig} from '../auth/environment'

interface SendAccountLinkEmailInput {
  readonly challengeToken: string
  readonly email: string
  readonly request: Request
}

export const sendAccountLinkEmail = async (input: SendAccountLinkEmailInput): Promise<boolean> => {
  const requestUrl = new URL(input.request.url)
  const endpoint = new URL('/api/auth/sign-in/magic-link', requestUrl.origin)
  const callbackUrl = new URL('/account', requestUrl.origin)
  const errorCallbackUrl = new URL('/account', requestUrl.origin)

  callbackUrl.searchParams.set('link_token', input.challengeToken)
  errorCallbackUrl.searchParams.set('link_error', 'email')

  const response = await handleAuthProxyRequest({
    ...getNeonAuthProxyConfig(),
    path: 'sign-in/magic-link',
    request: new Request(endpoint, {
      body: JSON.stringify({
        callbackURL: callbackUrl.toString(),
        email: input.email,
        errorCallbackURL: errorCallbackUrl.toString(),
      }),
      headers: {'Content-Type': 'application/json', Origin: requestUrl.origin},
      method: 'POST',
    }),
  })

  return response.ok
}
