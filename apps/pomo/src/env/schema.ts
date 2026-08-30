import {allowedStringSchema} from './allowed'
import {pemSchema} from './pem'
import {postgresUrlSchema} from './postgres-url'
import {defaultedStringSchema, optionalStringSchema, requiredStringSchema} from './required'
import {urlSchema} from './url'

export const OPENAI_REASONING_EFFORTS = ['none', 'low', 'medium', 'high', 'xhigh', 'max'] as const

export const OPENAI_REASONING_EFFORTS_WITH_MINIMAL = [
  'minimal',
  ...OPENAI_REASONING_EFFORTS,
] as const

export const OPENAI_SERVICE_TIERS = ['auto', 'default', 'flex', 'priority'] as const

const BASIC_AUTH_PREFIX = 'Basic '
const DEFAULT_OPENAI_MODEL = 'gpt-5.6-luna'
const MINIMUM_COOKIE_SECRET_LENGTH = 32
const MINIMUM_CRON_SECRET_LENGTH = 16
const NODE_ENVIRONMENTS = ['development', 'production', 'test'] as const
const VERCEL_ENVIRONMENTS = ['development', 'preview', 'production'] as const

export const envSchema = {
  CRON_SECRET: requiredStringSchema('CRON_SECRET').min(
    MINIMUM_CRON_SECRET_LENGTH,
    `CRON_SECRET must contain at least ${MINIMUM_CRON_SECRET_LENGTH} characters`,
  ),
  DATABASE_URL: postgresUrlSchema('DATABASE_URL'),
  KMA_SERVICE_KEY: requiredStringSchema('KMA_SERVICE_KEY'),
  NEON_AUTH_BASE_URL: urlSchema('NEON_AUTH_BASE_URL', ['https:', 'http:']),
  NEON_AUTH_COOKIE_SECRET: requiredStringSchema('NEON_AUTH_COOKIE_SECRET').min(
    MINIMUM_COOKIE_SECRET_LENGTH,
    `NEON_AUTH_COOKIE_SECRET must contain at least ${MINIMUM_COOKIE_SECRET_LENGTH} characters`,
  ),
  NODE_ENV: allowedStringSchema('NODE_ENV', NODE_ENVIRONMENTS, 'production'),
  OPENAI_API_KEY: requiredStringSchema('OPENAI_API_KEY'),
  OPENAI_MODEL: defaultedStringSchema(DEFAULT_OPENAI_MODEL),
  OPENAI_REASONING_EFFORT: allowedStringSchema(
    'OPENAI_REASONING_EFFORT',
    OPENAI_REASONING_EFFORTS_WITH_MINIMAL,
    'medium',
  ),
  OPENAI_SERVICE_TIER: allowedStringSchema('OPENAI_SERVICE_TIER', OPENAI_SERVICE_TIERS, 'default'),
  OPENAI_WEBHOOK_SECRET: requiredStringSchema('OPENAI_WEBHOOK_SECRET'),
  POMO_TOSS_CALLBACK_AUTHORIZATION: optionalStringSchema.superRefine((authorization, context) => {
    if (authorization === undefined) {
      return
    }

    if (
      authorization.startsWith(BASIC_AUTH_PREFIX) &&
      authorization.length > BASIC_AUTH_PREFIX.length
    ) {
      return
    }

    context.addIssue({
      code: 'custom',
      message: 'POMO_TOSS_CALLBACK_AUTHORIZATION must contain a Basic authorization value',
    })
  }),
  POMO_TOSS_MTLS_CERT: pemSchema('POMO_TOSS_MTLS_CERT', ['CERTIFICATE']),
  POMO_TOSS_MTLS_KEY: pemSchema('POMO_TOSS_MTLS_KEY', [
    'PRIVATE KEY',
    'RSA PRIVATE KEY',
    'EC PRIVATE KEY',
  ]),
  VERCEL_ENV: allowedStringSchema('VERCEL_ENV', VERCEL_ENVIRONMENTS, 'development'),
}
