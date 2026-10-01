import {requestMagicLink} from '../magic-link'

interface RequestUserMagicLinkInput {
  readonly email: string
  readonly origin: string
}

export const requestUserMagicLink = async (input: RequestUserMagicLinkInput): Promise<boolean> => {
  const callbackUrl = new URL('/account', input.origin)
  return requestMagicLink({
    callbackURL: callbackUrl.toString(),
    email: input.email,
    errorCallbackURL: callbackUrl.toString(),
  })
}
