import 'server-only'

import {readEnum, readString, readUrl} from '../environment/schema'

export interface NeonAuthEnvironment {
  readonly NEON_AUTH_BASE_URL?: string
  readonly NEON_AUTH_COOKIE_SECRET?: string
  readonly NODE_ENV?: string
}

export interface NeonAuthProxyConfig {
  readonly baseUrl: string
  readonly cookieSecret: string
  readonly sameSite: 'lax'
}

const MINIMUM_COOKIE_SECRET_LENGTH = 32
const NODE_ENVIRONMENTS = ['development', 'production', 'test'] as const

const readBaseUrl = (environment: NeonAuthEnvironment): string => {
  const nodeEnvironment = readEnum(
    'NODE_ENV',
    environment.NODE_ENV,
    NODE_ENVIRONMENTS,
    'production',
  )
  const url = readUrl('NEON_AUTH_BASE_URL', environment.NEON_AUTH_BASE_URL, {
    protocols: ['https:', 'http:'],
  })

  if (url.protocol !== 'https:' && nodeEnvironment !== 'development') {
    throw new TypeError('NEON_AUTH_BASE_URL must use HTTPS outside development')
  }

  return url.toString().replace(/\/$/u, '')
}

const readCookieSecret = (value: string | undefined): string =>
  readString('NEON_AUTH_COOKIE_SECRET', value, {minimumLength: MINIMUM_COOKIE_SECRET_LENGTH})

export const getNeonAuthProxyConfig = (
  environment: NeonAuthEnvironment = process.env,
): NeonAuthProxyConfig => ({
  baseUrl: readBaseUrl(environment),
  cookieSecret: readCookieSecret(environment.NEON_AUTH_COOKIE_SECRET),
  sameSite: 'lax',
})
