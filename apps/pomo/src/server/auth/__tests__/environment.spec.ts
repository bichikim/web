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

  it.each([
    [{NEON_AUTH_COOKIE_SECRET: 'a-secure-cookie-secret-with-32-characters'}],
    [{NEON_AUTH_BASE_URL: 'https://example.neonauth.aws.neon.tech'}],
    [
      {
        NEON_AUTH_BASE_URL: 'https://example.neonauth.aws.neon.tech',
        NEON_AUTH_COOKIE_SECRET: 'too-short',
      },
    ],
  ])('should reject an incomplete environment', (environment) => {
    expect(() => getNeonAuthProxyConfig(environment)).toThrow(TypeError)
  })
})
