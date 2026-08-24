import {z} from 'zod'

import {apiJson, ApiJsonError, apiJsonRequest} from '../api-json'
import {apiFetch} from '../http-client'

export interface AccountSession {
  readonly email: string
}

export type CompleteWebAccountLinkResult = 'invalid' | 'linked'

const HTTP_UNAUTHORIZED = 401
const HTTP_CONFLICT = 409
const HTTP_GONE = 410
const accountSessionSchema: z.ZodType<AccountSession> = z.object({email: z.string()})

export const readAccountSession = async (): Promise<AccountSession | null> => {
  try {
    return await apiJson('account', {
      credentials: 'include',
      responseSchema: accountSessionSchema,
    })
  } catch (error: unknown) {
    if (
      error instanceof ApiJsonError &&
      error.kind === 'http' &&
      error.response.status === HTTP_UNAUTHORIZED
    ) {
      return null
    }

    if (error instanceof ApiJsonError && error.kind === 'http') {
      throw new Error('Web account session is unavailable')
    }

    if (error instanceof ApiJsonError && error.kind === 'schema') {
      return null
    }

    throw error
  }
}

export const completeAccountLink = async (token: string): Promise<CompleteWebAccountLinkResult> => {
  const response = await apiJsonRequest('account/complete-link', {
    body: {token},
    credentials: 'include',
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
