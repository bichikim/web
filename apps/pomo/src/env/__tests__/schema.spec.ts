import {describe, expect, it} from 'vitest'

import {
  allowedStringSchema,
  defaultedStringSchema,
  envSchema,
  OPENAI_REASONING_EFFORTS_WITH_MINIMAL,
  OPENAI_SERVICE_TIERS,
  optionalStringSchema,
  pemSchema,
  postgresUrlSchema,
  requiredStringSchema,
  urlSchema,
} from '../schema'

describe('requiredStringSchema', () => {
  const schema = requiredStringSchema('FOO')

  it('should return a trimmed value', () => {
    expect(schema.parse('  bar  ')).toBe('bar')
  })

  it.each(['', '  '])('should reject a missing value', (value) => {
    expect(() => schema.parse(value)).toThrow('FOO is not set')
  })
})

describe('optionalStringSchema', () => {
  it.each([undefined, '', '  '])('should treat a blank value as omitted', (value) => {
    expect(optionalStringSchema.parse(value)).toBeUndefined()
  })

  it('should return a trimmed value', () => {
    expect(optionalStringSchema.parse('  bar  ')).toBe('bar')
  })
})

describe('defaultedStringSchema', () => {
  const schema = defaultedStringSchema('fallback')

  it.each([undefined, '', '  '])('should fall back when the value is blank', (value) => {
    expect(schema.parse(value)).toBe('fallback')
  })

  it('should return a trimmed value', () => {
    expect(schema.parse('  explicit  ')).toBe('explicit')
  })
})

describe('allowedStringSchema', () => {
  const values = ['red', 'blue'] as const
  const schema = allowedStringSchema('COLOR', values, 'red')

  it.each(values)('should accept every supported value', (value) => {
    expect(schema.parse(value)).toBe(value)
  })

  it.each([undefined, '', '  '])('should default a blank value', (value) => {
    expect(schema.parse(value)).toBe('red')
  })

  it('should trim a supported value', () => {
    expect(schema.parse('  blue  ')).toBe('blue')
  })

  it('should reject an unsupported value', () => {
    expect(() => schema.parse('green')).toThrow('COLOR must be one of: red, blue')
  })
})

describe('urlSchema', () => {
  const schema = urlSchema('ORIGIN', ['https:', 'http:'])

  it('should return a trimmed URL', () => {
    expect(schema.parse(' https://example.com/path ')).toBe('https://example.com/path')
  })

  it.each(['', '  '])('should reject a missing URL', (value) => {
    expect(() => schema.parse(value)).toThrow('ORIGIN is not set')
  })

  it('should reject an invalid URL without echoing its value', () => {
    const invalidUrl = 'not-a-url-with-sensitive-text'

    expect(() => schema.parse(invalidUrl)).toThrow('ORIGIN must be a valid URL')

    try {
      schema.parse(invalidUrl)
    } catch (error) {
      expect(String(error)).not.toContain(invalidUrl)
    }
  })

  it('should reject a URL with an unsupported protocol', () => {
    expect(() => schema.parse('ftp://example.com')).toThrow('ORIGIN must use https: or http:')
  })
})

describe('postgresUrlSchema', () => {
  const schema = postgresUrlSchema('DATABASE_URL')

  it.each([
    'postgres://user:password@example.com/pomo?sslmode=require',
    'postgresql://user:password@example.com/pomo?sslmode=require',
  ])('should return a valid Postgres URL', (url) => {
    expect(schema.parse(url)).toBe(url)
  })

  it('should trim a valid URL', () => {
    const url = 'postgresql://user:password@example.com/pomo?sslmode=require'

    expect(schema.parse(` ${url} `)).toBe(url)
  })

  it('should reject a missing URL', () => {
    expect(() => schema.parse('')).toThrow('DATABASE_URL is not set')
  })

  it('should reject a non-Postgres URL', () => {
    expect(() => schema.parse('https://example.com/database')).toThrow(
      'DATABASE_URL must use postgres: or postgresql:',
    )
  })

  it('should reject an invalid URL without echoing its value', () => {
    const invalidUrl = 'not-a-url-with-sensitive-text'

    expect(() => schema.parse(invalidUrl)).toThrow('DATABASE_URL must be a valid URL')

    try {
      schema.parse(invalidUrl)
    } catch (error) {
      expect(String(error)).not.toContain(invalidUrl)
    }
  })
})

describe('pemSchema', () => {
  const certSchema = pemSchema('POMO_TOSS_MTLS_CERT', ['CERTIFICATE'])
  const keySchema = pemSchema('POMO_TOSS_MTLS_KEY', [
    'PRIVATE KEY',
    'RSA PRIVATE KEY',
    'EC PRIVATE KEY',
  ])

  it('should restore PEM line breaks from environment values', () => {
    expect(
      certSchema.parse('-----BEGIN CERTIFICATE-----\\nCERT BODY\\n-----END CERTIFICATE-----'),
    ).toBe('-----BEGIN CERTIFICATE-----\nCERT BODY\n-----END CERTIFICATE-----')
    expect(
      keySchema.parse('-----BEGIN PRIVATE KEY-----\\nKEY BODY\\n-----END PRIVATE KEY-----'),
    ).toBe('-----BEGIN PRIVATE KEY-----\nKEY BODY\n-----END PRIVATE KEY-----')
  })

  it('should normalize CRLF PEM values', () => {
    expect(
      certSchema.parse('-----BEGIN CERTIFICATE-----\r\nCERT BODY\r\n-----END CERTIFICATE-----'),
    ).toBe('-----BEGIN CERTIFICATE-----\nCERT BODY\n-----END CERTIFICATE-----')
    expect(
      keySchema.parse(
        '-----BEGIN RSA PRIVATE KEY-----\r\nKEY BODY\r\n-----END RSA PRIVATE KEY-----',
      ),
    ).toBe('-----BEGIN RSA PRIVATE KEY-----\nKEY BODY\n-----END RSA PRIVATE KEY-----')
  })

  it('should reject values without the expected PEM envelope', () => {
    expect(() => certSchema.parse('CERT BODY')).toThrow(
      'POMO_TOSS_MTLS_CERT must contain a valid PEM value',
    )
  })

  it('should reject a missing certificate', () => {
    expect(() => certSchema.parse('')).toThrow('POMO_TOSS_MTLS_CERT')
  })

  it('should reject a missing private key', () => {
    expect(() => keySchema.parse('  ')).toThrow('POMO_TOSS_MTLS_KEY')
  })

  it('should accept an EC private key envelope', () => {
    expect(
      keySchema.parse('-----BEGIN EC PRIVATE KEY-----\nKEY BODY\n-----END EC PRIVATE KEY-----'),
    ).toBe('-----BEGIN EC PRIVATE KEY-----\nKEY BODY\n-----END EC PRIVATE KEY-----')
  })
})

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
