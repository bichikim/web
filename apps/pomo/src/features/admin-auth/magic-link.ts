import {apiFetch} from '../http-client'

interface AdminMagicLinkInput {
  readonly email: string
  readonly origin: string
}

export const requestAdminMagicLink = async (input: AdminMagicLinkInput): Promise<boolean> => {
  const callbackURL = new URL('/admin', input.origin)
  const errorCallbackURL = new URL('/admin/login', input.origin)
  const response = await apiFetch('auth/sign-in/magic-link', {
    body: JSON.stringify({
      callbackURL: callbackURL.toString(),
      email: input.email,
      errorCallbackURL: errorCallbackURL.toString(),
    }),
    credentials: 'include',
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })

  return response.ok
}
