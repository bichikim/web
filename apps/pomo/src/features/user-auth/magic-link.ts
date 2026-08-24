import {apiJsonRequest} from '../api-json'

interface RequestUserMagicLinkInput {
  readonly email: string
  readonly origin: string
}

export const requestUserMagicLink = async (input: RequestUserMagicLinkInput): Promise<boolean> => {
  const callbackUrl = new URL('/account', input.origin)
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
