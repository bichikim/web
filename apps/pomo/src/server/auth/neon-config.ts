import {env} from 'src/env'

export interface NeonAuthProxyConfig {
  readonly baseUrl: string
  readonly cookieSecret: string
  readonly sameSite: 'lax'
}

/** Returns Neon Auth proxy settings for the current process. */
export const readNeonAuthProxyConfig = (): NeonAuthProxyConfig => {
  const url = new URL(env.NEON_AUTH_BASE_URL)

  if (url.protocol !== 'https:' && env.NODE_ENV !== 'development') {
    throw new TypeError('NEON_AUTH_BASE_URL must use HTTPS outside development')
  }

  return {
    baseUrl: url.toString().replace(/\/$/u, ''),
    cookieSecret: env.NEON_AUTH_COOKIE_SECRET,
    sameSite: 'lax',
  }
}
