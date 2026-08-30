import {afterEach, describe, expect, it, vi} from 'vitest'

const environmentMocks = vi.hoisted(() => ({
  env: {
    NEON_AUTH_BASE_URL: 'https://example.neonauth.aws.neon.tech/neondb/auth/',
    NEON_AUTH_COOKIE_SECRET: 'a-secure-cookie-secret-with-32-characters',
    NODE_ENV: 'test',
  },
}))

vi.mock('src/env', () => ({
  env: environmentMocks.env,
}))

import {readNeonAuthProxyConfig} from '../neon-config'

afterEach(() => {
  environmentMocks.env.NEON_AUTH_BASE_URL = 'https://example.neonauth.aws.neon.tech/neondb/auth/'
  environmentMocks.env.NEON_AUTH_COOKIE_SECRET = 'a-secure-cookie-secret-with-32-characters'
  environmentMocks.env.NODE_ENV = 'test'
})

describe('readNeonAuthProxyConfig', () => {
  it('should return Neon Auth proxy settings with a trailing slash removed', () => {
    expect(readNeonAuthProxyConfig()).toEqual({
      baseUrl: 'https://example.neonauth.aws.neon.tech/neondb/auth',
      cookieSecret: 'a-secure-cookie-secret-with-32-characters',
      sameSite: 'lax',
    })
  })

  it('should allow HTTP only in development', () => {
    environmentMocks.env.NEON_AUTH_BASE_URL = 'http://localhost:3000/auth'
    environmentMocks.env.NODE_ENV = 'development'

    expect(readNeonAuthProxyConfig().baseUrl).toBe('http://localhost:3000/auth')

    environmentMocks.env.NODE_ENV = 'test'
    expect(() => readNeonAuthProxyConfig()).toThrow(
      'NEON_AUTH_BASE_URL must use HTTPS outside development',
    )

    environmentMocks.env.NODE_ENV = 'production'
    expect(() => readNeonAuthProxyConfig()).toThrow(
      'NEON_AUTH_BASE_URL must use HTTPS outside development',
    )
  })
})
