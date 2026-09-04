import {z} from 'zod'

/** Schema for a required environment string that treats whitespace as missing. */
export const requiredStringSchema = (name: string) =>
  z.string(`${name} is not set`).trim().min(1, `${name} is not set`)

/** Schema for an optional environment string that treats whitespace as omitted. */
export const optionalStringSchema = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim()
    return trimmed ? trimmed : undefined
  })

/** Schema for an optional environment string that falls back to a default. */
export const defaultedStringSchema = (defaultValue: string) =>
  optionalStringSchema.pipe(z.string().default(defaultValue))

/** Schema for an environment enum that falls back to a default. */
export const allowedStringSchema = <const Value extends string>(
  name: string,
  values: readonly [Value, ...Value[]],
  defaultValue: Value,
) =>
  optionalStringSchema.pipe(
    z.enum(values, `${name} must be one of: ${values.join(', ')}`).default(defaultValue),
  )

/** Schema for an environment URL restricted to the given protocols. */
export const urlSchema = (name: string, protocols: ReadonlyArray<string>) =>
  requiredStringSchema(name).superRefine((value, context) => {
    let url: URL

    try {
      url = new URL(value)
    } catch {
      context.addIssue({
        code: 'custom',
        message: `${name} must be a valid URL`,
      })
      return
    }

    if (protocols.includes(url.protocol)) {
      return
    }

    context.addIssue({
      code: 'custom',
      message: `${name} must use ${protocols.join(' or ')}`,
    })
  })

/** Schema for a postgres or postgresql environment URL. */
export const postgresUrlSchema = (name: string) => urlSchema(name, ['postgres:', 'postgresql:'])

/** Schema for a PEM environment value with restored line breaks. */
export const pemSchema = (name: string, labels: ReadonlyArray<string>) =>
  requiredStringSchema(name)
    .transform((value) => value.replaceAll('\\n', '\n').replaceAll('\r\n', '\n').trim())
    .superRefine((pem, context) => {
      const hasExpectedEnvelope = labels.some(
        (label) =>
          pem.startsWith(`-----BEGIN ${label}-----\n`) && pem.endsWith(`-----END ${label}-----`),
      )

      if (hasExpectedEnvelope) {
        return
      }

      context.addIssue({
        code: 'custom',
        message: `${name} must contain a valid PEM value`,
      })
    })

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
  GOOGLE_CALENDAR_CLIENT_ID: optionalStringSchema,
  GOOGLE_CALENDAR_CLIENT_SECRET: optionalStringSchema,
  KMA_SERVICE_KEY: requiredStringSchema('KMA_SERVICE_KEY'),
  MICROSOFT_CALENDAR_CLIENT_ID: optionalStringSchema,
  MICROSOFT_CALENDAR_CLIENT_SECRET: optionalStringSchema,
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
  OPENWEATHER_API_KEY: requiredStringSchema('OPENWEATHER_API_KEY'),
  POMO_CALENDAR_TOKEN_ENCRYPTION_KEY: optionalStringSchema,
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
