import {describe, expect, it} from 'vitest'

import {applyCorsPreflightHeaders, applyCorsResponseHeaders, isCorsOriginAllowed} from '../cors.ts'

describe('isCorsOriginAllowed', () => {
  it.each([
    'https://pomofi.io',
    'https://www.pomofi.io',
    'https://pomo-app.apps.tossmini.com',
    'https://pomo-app.private-apps.tossmini.com',
  ])('should allow %s', (origin) => {
    expect(isCorsOriginAllowed(origin, 'https://deployment.vercel.app')).toBe(true)
  })

  it.each([
    'http://localhost:3000',
    'http://localhost:3100',
    'http://localhost:3200',
    'http://localhost:3300',
    'http://localhost:3400',
  ])('should allow %s during development', (origin) => {
    expect(import.meta.env.DEV).toBe(true)
    expect(isCorsOriginAllowed(origin, 'https://deployment.vercel.app')).toBe(true)
  })

  it('should allow the current deployment origin', () => {
    const selfOrigin = 'https://pomo-git-feature.example.vercel.app'

    expect(isCorsOriginAllowed(selfOrigin, selfOrigin)).toBe(true)
  })

  it.each([
    null,
    'https://pomofi.com',
    'https://www.pomofi.com',
    'https://evil.pomofi.io',
    'https://pomofi.io.evil.example',
  ])('should reject %s', (origin) => {
    expect(isCorsOriginAllowed(origin, 'https://deployment.vercel.app')).toBe(false)
  })
})

describe('applyCorsResponseHeaders', () => {
  it('should add credentialed response headers for an allowed origin', () => {
    const headers = new Headers({Vary: 'Accept-Encoding'})

    expect(
      applyCorsResponseHeaders(headers, 'https://pomofi.io', 'https://deployment.vercel.app'),
    ).toBe(true)
    expect(Object.fromEntries(headers)).toMatchObject({
      'access-control-allow-credentials': 'true',
      'access-control-allow-origin': 'https://pomofi.io',
      vary: 'Accept-Encoding, Origin',
    })
    expect(headers.get('Access-Control-Expose-Headers')).toContain('ETag')
  })

  it('should only vary the response for a rejected origin', () => {
    const headers = new Headers()

    expect(
      applyCorsResponseHeaders(headers, 'https://pomofi.com', 'https://deployment.vercel.app'),
    ).toBe(false)
    expect(Object.fromEntries(headers)).toEqual({vary: 'Origin'})
  })

  it('should not duplicate an existing Origin vary value', () => {
    const headers = new Headers({Vary: 'Accept-Encoding, origin'})

    applyCorsResponseHeaders(headers, null, 'https://deployment.vercel.app')

    expect(headers.get('Vary')).toBe('Accept-Encoding, origin')
  })
})

describe('applyCorsPreflightHeaders', () => {
  it('should add API methods, request headers, and cache duration', () => {
    const headers = new Headers()

    applyCorsPreflightHeaders(headers)

    expect(headers.get('Access-Control-Allow-Methods')).toBe(
      'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS',
    )
    expect(headers.get('Access-Control-Allow-Headers')).toBe(
      'Authorization, Content-Type, Range, X-CSRF-Token',
    )
    expect(headers.get('Access-Control-Max-Age')).toBe('86400')
  })
})
