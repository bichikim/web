import {apiJsonRequest} from '../api-json'
import {getSafeReturnTo} from './return-path'

interface RequestUserMagicLinkInput {
  readonly email: string
  readonly origin: string
  readonly returnTo?: string
}

export const requestUserMagicLink = async (input: RequestUserMagicLinkInput): Promise<boolean> => {
  const callbackUrl = new URL('/account', input.origin)
  const returnTo = getSafeReturnTo(input.returnTo)

  if (returnTo !== null) {
    callbackUrl.searchParams.set('returnTo', returnTo)
  }

  const response = await apiJsonRequest('auth/sign-in/magic-link', {
    body: {
      callbackURL: callbackUrl.toString(),
      email: input.email,
      errorCallbackURL: callbackUrl.toString(),
    },
    credentials: 'include',
    method: 'POST',
  })

  return response.ok
}
