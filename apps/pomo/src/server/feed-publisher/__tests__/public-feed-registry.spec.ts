import {describe, expect, it} from 'vitest'

import {getPublicOrigin} from '../public-feed-registry'

const REQUEST = new Request('http://localhost:3000/api/feeds/today-in-history/rss.xml')

describe('getPublicOrigin', () => {
  it.each(['development', 'preview'])(
    'should use the request origin in the %s environment',
    (vercelEnvironment) => {
      expect(getPublicOrigin(REQUEST, {VERCEL_ENV: vercelEnvironment})).toBe(
        'http://localhost:3000',
      )
    },
  )

  it('should default to the request origin outside Vercel', () => {
    expect(getPublicOrigin(REQUEST, {})).toBe('http://localhost:3000')
  })

  it('should use the configured HTTPS origin in production', () => {
    expect(
      getPublicOrigin(REQUEST, {
        POMO_PUBLIC_ORIGIN: ' https://www.pomofi.io/feed-path ',
        VERCEL_ENV: 'production',
      }),
    ).toBe('https://www.pomofi.io')
  })

  it.each([undefined, '', 'http://www.pomofi.io', 'ftp://www.pomofi.io', 'not-a-url'])(
    'should reject an invalid production origin',
    (origin) => {
      expect(() =>
        getPublicOrigin(REQUEST, {
          POMO_PUBLIC_ORIGIN: origin,
          VERCEL_ENV: 'production',
        }),
      ).toThrow('POMO_PUBLIC_ORIGIN')
    },
  )

  it('should reject an invalid Vercel environment', () => {
    expect(() => getPublicOrigin(REQUEST, {VERCEL_ENV: 'staging'})).toThrow(
      'VERCEL_ENV must be one of: development, preview, production',
    )
  })

  it('should not validate an unused production origin outside production', () => {
    expect(
      getPublicOrigin(REQUEST, {
        POMO_PUBLIC_ORIGIN: 'not-a-url',
        VERCEL_ENV: 'preview',
      }),
    ).toBe('http://localhost:3000')
  })
})
