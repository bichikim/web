import {getRequestEvent} from 'solid-js/web'

import {getNeonSession} from './get-neon-session'
import type {AuthSessionResult, NeonSession, TossSession} from './types'

interface AuthSessionOptions {
  readonly provider?: 'neon' | 'toss'
}

const getRequestedProvider = (request: Request, options?: AuthSessionOptions): 'neon' | 'toss' =>
  options?.provider ?? (request.headers.has('Authorization') ? 'toss' : 'neon')

const getTossSession = async (request: Request): Promise<TossSession> => {
  const {authenticateAppRequest} = await import('src/server/auth/authenticate-app-request')
  const identity = await authenticateAppRequest(request)
  return {
    access: identity === null ? 'anonymous' : 'user',
    provider: 'toss',
    setCookies: [],
    userId: identity?.userId ?? null,
  }
}

/** Resolves one shared session per matching middleware request without creating a Pomo user. */
export function getAuthSession(
  request: Request,
  options: {readonly provider: 'neon'},
): Promise<NeonSession>
export function getAuthSession(
  request: Request,
  options: {readonly provider: 'toss'},
): Promise<TossSession>
export function getAuthSession(
  request: Request,
  options?: AuthSessionOptions,
): Promise<AuthSessionResult>
export function getAuthSession(
  request: Request,
  options?: AuthSessionOptions,
): Promise<AuthSessionResult> {
  const authentication = getRequestEvent()?.locals.authentication
  const provider = getRequestedProvider(request, options)

  if (authentication === undefined || authentication.request !== request) {
    return provider === 'neon' ? getNeonSession(request) : getTossSession(request)
  }

  if (provider === 'neon') {
    authentication.neonResult ??= getNeonSession(request)
    return authentication.neonResult
  }

  authentication.tossResult ??= getTossSession(request)
  return authentication.tossResult
}
