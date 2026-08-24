import 'server-only'

export interface NeonAuthEnvironment {
  readonly NEON_AUTH_BASE_URL?: string
  readonly NEON_AUTH_COOKIE_SECRET?: string
}

export interface NeonAuthProxyConfig {
  readonly baseUrl: string
  readonly cookieSecret: string
  readonly sameSite: 'lax'
}

const MINIMUM_COOKIE_SECRET_LENGTH = 32

const readBaseUrl = (value: string | undefined): string => {
  if (!value?.trim()) {
    throw new TypeError('NEON_AUTH_BASE_URL is not set')
  }

  const url = new URL(value)

  if (url.protocol !== 'https:' && !import.meta.env.DEV) {
    throw new TypeError('NEON_AUTH_BASE_URL must use HTTPS outside development')
  }

  return url.toString().replace(/\/$/u, '')
}

const readCookieSecret = (value: string | undefined): string => {
  if (!value || value.length < MINIMUM_COOKIE_SECRET_LENGTH) {
    throw new TypeError('NEON_AUTH_COOKIE_SECRET must contain at least 32 characters')
  }

  return value
}

export const getNeonAuthProxyConfig = (
  environment: NeonAuthEnvironment = process.env,
): NeonAuthProxyConfig => ({
  baseUrl: readBaseUrl(environment.NEON_AUTH_BASE_URL),
  cookieSecret: readCookieSecret(environment.NEON_AUTH_COOKIE_SECRET),
  sameSite: 'lax',
})
