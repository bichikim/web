import {apiJsonRequest} from '../api-json'
export interface RequestMagicLinkOptions {
  readonly email: string
  readonly callbackURL: string
  readonly errorCallbackURL: string
}
/** Requests a credentialed email sign-in link with caller-owned redirects. */
export const requestMagicLink = async (options: RequestMagicLinkOptions): Promise<boolean> => {
  const response = await apiJsonRequest('auth/sign-in/magic-link', {
    body: options,
    credentials: 'include',
    method: 'POST',
  })
  return response.ok
}
