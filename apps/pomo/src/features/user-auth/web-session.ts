import {apiFetch} from '../http-client'

export interface AccountSession {
  readonly email: string
}

export type CompleteWebAccountLinkResult = 'invalid' | 'linked'

const HTTP_UNAUTHORIZED = 401
const HTTP_CONFLICT = 409
const HTTP_GONE = 410

export const readAccountSession = async (): Promise<AccountSession | null> => {
  const response = await apiFetch('account', {credentials: 'include'})

  if (!response.ok) {
    if (response.status === HTTP_UNAUTHORIZED) {
      return null
    }

    throw new Error('Web account session is unavailable')
  }

  const body: unknown = await response.json()

  if (
    typeof body !== 'object' ||
    body === null ||
    !('email' in body) ||
    typeof body.email !== 'string'
  ) {
    return null
  }

  return {email: body.email}
}

export const completeAccountLink = async (token: string): Promise<CompleteWebAccountLinkResult> => {
  const response = await apiFetch('account/complete-link', {
    body: JSON.stringify({token}),
    credentials: 'include',
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })

  if (response.ok) {
    return 'linked'
  }

  if (response.status === HTTP_CONFLICT || response.status === HTTP_GONE) {
    return 'invalid'
  }

  throw new Error('Account link completion is unavailable')
}

export const signOutWebSession = async (): Promise<boolean> => {
  const response = await apiFetch('auth/sign-out', {
    credentials: 'include',
    method: 'POST',
  })

  return response.ok
}
