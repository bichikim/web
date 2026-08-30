import {describe, expect, it} from 'vitest'

import {envSchema, OPENAI_REASONING_EFFORTS_WITH_MINIMAL, OPENAI_SERVICE_TIERS} from '../schema'

it('should import env schemas without reading process environment', async () => {
  await expect(import('../schema')).resolves.toMatchObject({
    envSchema: expect.objectContaining({
      DATABASE_URL: expect.anything(),
    }),
  })
})

describe('OPENAI_*', () => {
  it('should parse and trim explicit generation settings', () => {
    expect(envSchema.OPENAI_API_KEY.parse('  sk-test-secret  ')).toBe('sk-test-secret')
    expect(envSchema.OPENAI_MODEL.parse('  gpt-example  ')).toBe('gpt-example')
    expect(envSchema.OPENAI_REASONING_EFFORT.parse(' high ')).toBe('high')
    expect(envSchema.OPENAI_SERVICE_TIER.parse(' priority ')).toBe('priority')
  })

  it('should default the model, reasoning effort, and service tier', () => {
    expect(envSchema.OPENAI_MODEL.parse('')).toBe('gpt-5.6-luna')
    expect(envSchema.OPENAI_REASONING_EFFORT.parse('')).toBe('medium')
    expect(envSchema.OPENAI_SERVICE_TIER.parse('')).toBe('default')
  })

  it.each(['', '  '])('should reject a missing API key', (apiKey) => {
    expect(() => envSchema.OPENAI_API_KEY.parse(apiKey)).toThrow('OPENAI_API_KEY is not set')
  })

  it.each(OPENAI_REASONING_EFFORTS_WITH_MINIMAL)(
    'should accept every supported reasoning effort',
    (reasoningEffort) => {
      expect(envSchema.OPENAI_REASONING_EFFORT.parse(reasoningEffort)).toBe(reasoningEffort)
    },
  )

  it.each(OPENAI_SERVICE_TIERS)('should accept every supported service tier', (serviceTier) => {
    expect(envSchema.OPENAI_SERVICE_TIER.parse(serviceTier)).toBe(serviceTier)
  })

  it('should reject an unsupported reasoning effort', () => {
    expect(() => envSchema.OPENAI_REASONING_EFFORT.parse('ultra')).toThrow(
      `OPENAI_REASONING_EFFORT must be one of: ${OPENAI_REASONING_EFFORTS_WITH_MINIMAL.join(', ')}`,
    )
  })

  it('should reject an unsupported service tier', () => {
    expect(() => envSchema.OPENAI_SERVICE_TIER.parse('fast')).toThrow(
      `OPENAI_SERVICE_TIER must be one of: ${OPENAI_SERVICE_TIERS.join(', ')}`,
    )
  })
})

describe('OPENAI_WEBHOOK_SECRET', () => {
  it('should return a trimmed webhook secret', () => {
    expect(envSchema.OPENAI_WEBHOOK_SECRET.parse(' whsec_test ')).toBe('whsec_test')
  })

  it('should reject a missing webhook secret', () => {
    expect(() => envSchema.OPENAI_WEBHOOK_SECRET.parse('')).toThrow(
      'OPENAI_WEBHOOK_SECRET is not set',
    )
  })
})

describe('NEON_AUTH_*', () => {
  it('should parse a valid Neon Auth URL and cookie secret', () => {
    expect(
      envSchema.NEON_AUTH_BASE_URL.parse('https://example.neonauth.aws.neon.tech/neondb/auth/'),
    ).toBe('https://example.neonauth.aws.neon.tech/neondb/auth/')
    expect(
      envSchema.NEON_AUTH_COOKIE_SECRET.parse('a-secure-cookie-secret-with-32-characters'),
    ).toBe('a-secure-cookie-secret-with-32-characters')
  })

  it('should trim the cookie secret after validating its normalized length', () => {
    const cookieSecret = 'a-secure-cookie-secret-with-32-characters'

    expect(
      envSchema.NEON_AUTH_BASE_URL.parse(' https://example.neonauth.aws.neon.tech/neondb/auth/ '),
    ).toBe('https://example.neonauth.aws.neon.tech/neondb/auth/')
    expect(envSchema.NEON_AUTH_COOKIE_SECRET.parse(`  ${cookieSecret}  `)).toBe(cookieSecret)
  })

  it.each(['', 'too-short', '                                '])(
    'should reject an incomplete cookie secret',
    (cookieSecret) => {
      expect(() => envSchema.NEON_AUTH_COOKIE_SECRET.parse(cookieSecret)).toThrow(
        'NEON_AUTH_COOKIE_SECRET',
      )
    },
  )

  it('should reject a missing Neon Auth URL', () => {
    expect(() => envSchema.NEON_AUTH_BASE_URL.parse('')).toThrow('NEON_AUTH_BASE_URL is not set')
  })
})

describe('NODE_ENV', () => {
  it('should reject an invalid runtime environment', () => {
    expect(() => envSchema.NODE_ENV.parse('staging')).toThrow(
      'NODE_ENV must be one of: development, production, test',
    )
  })
})

describe('POMO_TOSS_CALLBACK_AUTHORIZATION', () => {
  it('should read a Basic callback authorization value', () => {
    expect(envSchema.POMO_TOSS_CALLBACK_AUTHORIZATION.parse(' Basic dXNlcjpwYXNz ')).toBe(
      'Basic dXNlcjpwYXNz',
    )
  })

  it.each([undefined, '', '  '])(
    'should omit a missing callback authorization value',
    (authorization) => {
      expect(envSchema.POMO_TOSS_CALLBACK_AUTHORIZATION.parse(authorization)).toBeUndefined()
    },
  )

  it.each(['Bearer token', 'Basic '])(
    'should reject an invalid callback authorization value',
    (authorization) => {
      expect(() => envSchema.POMO_TOSS_CALLBACK_AUTHORIZATION.parse(authorization)).toThrow(
        'POMO_TOSS_CALLBACK_AUTHORIZATION',
      )
    },
  )
})

describe('OPENWEATHER_API_KEY', () => {
  it('should return a trimmed API key', () => {
    expect(envSchema.OPENWEATHER_API_KEY.parse(' openweather-key ')).toBe('openweather-key')
  })

  it.each(['', '  '])('should reject a missing API key', (apiKey) => {
    expect(() => envSchema.OPENWEATHER_API_KEY.parse(apiKey)).toThrow(
      'OPENWEATHER_API_KEY is not set',
    )
  })
})

describe('KMA_SERVICE_KEY', () => {
  it('should return a trimmed service key', () => {
    expect(envSchema.KMA_SERVICE_KEY.parse(' decoded-service-key ')).toBe('decoded-service-key')
  })

  it.each(['', '  '])('should reject a missing service key', (serviceKey) => {
    expect(() => envSchema.KMA_SERVICE_KEY.parse(serviceKey)).toThrow('KMA_SERVICE_KEY is not set')
  })
})

describe('CRON_SECRET', () => {
  it.each([
    {error: 'CRON_SECRET is not set', secret: ' '},
    {error: 'CRON_SECRET must contain at least 16 characters', secret: 'too-short'},
  ])('should reject an invalid cron secret', ({error, secret}) => {
    expect(() => envSchema.CRON_SECRET.parse(secret)).toThrow(error)
  })

  it('should trim the configured bearer token', () => {
    expect(envSchema.CRON_SECRET.parse('  cron-secret-1234  ')).toBe('cron-secret-1234')
  })
})

describe('VERCEL_ENV', () => {
  it('should reject an invalid Vercel environment', () => {
    expect(() => envSchema.VERCEL_ENV.parse('staging')).toThrow(
      'VERCEL_ENV must be one of: development, preview, production',
    )
  })
})
