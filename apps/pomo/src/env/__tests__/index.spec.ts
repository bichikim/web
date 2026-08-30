import {afterEach, beforeEach, expect, it, vi} from 'vitest'

const completeEnv = {
  CRON_SECRET: 'cron-secret-1234',
  DATABASE_URL: 'postgresql://user:password@example.com/pomo?sslmode=require',
  KMA_SERVICE_KEY: 'decoded-service-key',
  NEON_AUTH_BASE_URL: 'https://example.neonauth.aws.neon.tech/neondb/auth/',
  NEON_AUTH_COOKIE_SECRET: 'a-secure-cookie-secret-with-32-characters',
  OPENAI_API_KEY: 'sk-test-secret',
  OPENAI_WEBHOOK_SECRET: 'whsec_test',
  OPENWEATHER_API_KEY: 'openweather-key',
  POMO_TOSS_CALLBACK_AUTHORIZATION: 'Basic dXNlcjpwYXNz',
  POMO_TOSS_MTLS_CERT: '-----BEGIN CERTIFICATE-----\nCERT BODY\n-----END CERTIFICATE-----',
  POMO_TOSS_MTLS_KEY: '-----BEGIN PRIVATE KEY-----\nKEY BODY\n-----END PRIVATE KEY-----',
} as const

beforeEach(() => {
  vi.resetModules()

  for (const [name, value] of Object.entries(completeEnv)) {
    vi.stubEnv(name, value)
  }
})

afterEach(() => {
  vi.unstubAllEnvs()
})

it('should export a parsed env aligned with envSchema', async () => {
  const {env, envSchema} = await import('../index')

  expect(Object.keys(env).sort()).toEqual(Object.keys(envSchema).sort())
  expect(env.OPENAI_API_KEY).toBe('sk-test-secret')
})

it('should defer validation until a key is read', async () => {
  vi.unstubAllEnvs()

  const {env, envSchema} = await import('../index')

  expect(Object.keys(env).sort()).toEqual(Object.keys(envSchema).sort())
  expect(() => env.CRON_SECRET).toThrow('CRON_SECRET is not set')
})
