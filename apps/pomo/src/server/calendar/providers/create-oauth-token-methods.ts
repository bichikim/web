import {requestTokens} from './oauth'
import type {CalendarProvider, CreateCalendarProviderOptions} from './types'
export interface OAuthTokenMethodsOptions extends Pick<
  CreateCalendarProviderOptions,
  'clientId' | 'clientSecret'
> {
  readonly fetch: typeof globalThis.fetch
  readonly now: () => Date
  readonly tokenUrl: string
  readonly scope?: string
}
/** Exchanges authorization codes and refreshes tokens with provider-owned token settings. */
export const createOAuthTokenMethods = (
  options: OAuthTokenMethodsOptions,
): Pick<CalendarProvider, 'exchangeCode' | 'refreshTokens'> => {
  const createTokenBody = () => {
    const body = new URLSearchParams([
      ['client_id', options.clientId],
      ['client_secret', options.clientSecret],
    ])
    if (options.scope !== undefined) {
      body.set('scope', options.scope)
    }
    return body
  }
  return {
    exchangeCode: (exchange) => {
      const body = createTokenBody()
      body.set('code', exchange.code)
      body.set('code_verifier', exchange.codeVerifier)
      body.set('grant_type', 'authorization_code')
      body.set('redirect_uri', exchange.redirectUri)
      return requestTokens({
        body,
        fetch: options.fetch,
        now: options.now,
        tokenUrl: options.tokenUrl,
      })
    },
    refreshTokens: async (refreshToken) => {
      const body = createTokenBody()
      body.set('grant_type', 'refresh_token')
      body.set('refresh_token', refreshToken)
      const tokens = await requestTokens({
        body,
        fetch: options.fetch,
        now: options.now,
        tokenUrl: options.tokenUrl,
      })
      return {...tokens, refreshToken: tokens.refreshToken ?? refreshToken}
    },
  }
}
