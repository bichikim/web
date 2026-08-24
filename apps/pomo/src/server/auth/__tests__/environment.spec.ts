import {describe, expect, it} from 'vitest'

import {getNeonAuthProxyConfig} from '../environment.ts'

describe('getNeonAuthProxyConfig', () => {
  it('should parse a valid Neon Auth environment', () => {
    expect(
      getNeonAuthProxyConfig({
        NEON_AUTH_BASE_URL: 'https://example.neonauth.aws.neon.tech/neondb/auth/',
        NEON_AUTH_COOKIE_SECRET: 'a-secure-cookie-secret-with-32-characters',
      }),
    ).toEqual({
      baseUrl: 'https://example.neonauth.aws.neon.tech/neondb/auth',
      cookieSecret: 'a-secure-cookie-secret-with-32-characters',
      sameSite: 'lax',
    })
  })

  it('should trim the cookie secret after validating its normalized length', () => {
    const cookieSecret = 'a-secure-cookie-secret-with-32-characters'

    expect(
      getNeonAuthProxyConfig({
        NEON_AUTH_BASE_URL: ' https://example.neonauth.aws.neon.tech/neondb/auth/ ',
        NEON_AUTH_COOKIE_SECRET: `  ${cookieSecret}  `,
      }),
    ).toMatchObject({cookieSecret})
  })

  it('should allow HTTP only in development', () => {
    const environment = {
      NEON_AUTH_BASE_URL: 'http://localhost:3000/auth',
      NEON_AUTH_COOKIE_SECRET: 'a-secure-cookie-secret-with-32-characters',
    }

    expect(getNeonAuthProxyConfig({...environment, NODE_ENV: 'development'}).baseUrl).toBe(
      'http://localhost:3000/auth',
    )
    expect(() => getNeonAuthProxyConfig({...environment, NODE_ENV: 'test'})).toThrow(
      'NEON_AUTH_BASE_URL must use HTTPS outside development',
    )
    expect(() => getNeonAuthProxyConfig({...environment, NODE_ENV: 'production'})).toThrow(
      'NEON_AUTH_BASE_URL must use HTTPS outside development',
    )
  })

  it('should reject an invalid runtime environment', () => {
    expect(() =>
      getNeonAuthProxyConfig({
        NEON_AUTH_BASE_URL: 'https://example.neonauth.aws.neon.tech',
        NEON_AUTH_COOKIE_SECRET: 'a-secure-cookie-secret-with-32-characters',
        NODE_ENV: 'staging',
      }),
    ).toThrow('NODE_ENV must be one of: development, production, test')
  })

  it.each([
    [{NEON_AUTH_COOKIE_SECRET: 'a-secure-cookie-secret-with-32-characters'}],
    [{NEON_AUTH_BASE_URL: 'https://example.neonauth.aws.neon.tech'}],
    [
      {
        NEON_AUTH_BASE_URL: 'https://example.neonauth.aws.neon.tech',
        NEON_AUTH_COOKIE_SECRET: 'too-short',
      },
    ],
    [
      {
        NEON_AUTH_BASE_URL: 'https://example.neonauth.aws.neon.tech',
        NEON_AUTH_COOKIE_SECRET: '                                ',
      },
    ],
  ])('should reject an incomplete environment', (environment) => {
    expect(() => getNeonAuthProxyConfig(environment)).toThrow(TypeError)
  })
})
