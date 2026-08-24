import {apiFetch} from '../http-client'

interface RequestUserMagicLinkInput {
  readonly email: string
  readonly origin: string
}

export const requestUserMagicLink = async (input: RequestUserMagicLinkInput): Promise<boolean> => {
  const callbackUrl = new URL('/account', input.origin)
  const response = await apiFetch('auth/sign-in/magic-link', {
    body: JSON.stringify({
      callbackURL: callbackUrl.toString(),
      email: input.email,
      errorCallbackURL: callbackUrl.toString(),
    }),
    credentials: 'include',
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })

  return response.ok
}
