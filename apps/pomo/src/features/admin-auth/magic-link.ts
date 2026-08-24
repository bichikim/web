import {apiJsonRequest} from '../api-json'

interface AdminMagicLinkInput {
  readonly email: string
  readonly origin: string
}

export const requestAdminMagicLink = async (input: AdminMagicLinkInput): Promise<boolean> => {
  const callbackURL = new URL('/admin', input.origin)
  const errorCallbackURL = new URL('/admin/login', input.origin)
  const response = await apiJsonRequest('auth/sign-in/magic-link', {
    body: {
      callbackURL: callbackURL.toString(),
      email: input.email,
      errorCallbackURL: errorCallbackURL.toString(),
    },
    credentials: 'include',
    method: 'POST',
  })

  return response.ok
}
