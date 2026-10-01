import {requestMagicLink} from '../magic-link'

interface AdminMagicLinkInput {
  readonly email: string
  readonly origin: string
}

export const requestAdminMagicLink = async (input: AdminMagicLinkInput): Promise<boolean> => {
  const callbackURL = new URL('/admin', input.origin)
  const errorCallbackURL = new URL('/admin/login', input.origin)
  return requestMagicLink({
    callbackURL: callbackURL.toString(),
    email: input.email,
    errorCallbackURL: errorCallbackURL.toString(),
  })
}
