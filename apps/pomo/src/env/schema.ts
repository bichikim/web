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
const DEFAULT_AI_QUEUE_LIMIT = 100
const DEFAULT_AI_RUNNER_TIMEOUT_MS = 120_000
const MINIMUM_COOKIE_SECRET_LENGTH = 32
const MINIMUM_CRON_SECRET_LENGTH = 16
const MAXIMUM_AI_MONTHLY_CREDIT_CAP = 1_000_000
const MAXIMUM_AI_RUNNER_TIMEOUT_MS = 3_600_000
const MINIMUM_AI_RUNNER_TIMEOUT_MS = 5_000
const NODE_ENVIRONMENTS = ['development', 'production', 'test'] as const
const VERCEL_ENVIRONMENTS = ['development', 'preview', 'production'] as const

const defaultedIntegerSchema = (defaultValue: number, minimum: number, maximum: number) =>
  z.preprocess(
    (value) =>
      value === undefined || (typeof value === 'string' && value.trim() === '')
        ? defaultValue
        : value,
    z.coerce.number().int().min(minimum).max(maximum),
  )

const optionalPositiveIntegerSchema = z.preprocess(
  (value) =>
    value === undefined || (typeof value === 'string' && value.trim() === '') ? undefined : value,
  z.coerce.number().int().positive().optional(),
)

const optionalMonthlyCreditCapSchema = z.preprocess(
  (value) =>
    value === undefined || (typeof value === 'string' && value.trim() === '') ? undefined : value,
  z.coerce.number().int().positive().max(MAXIMUM_AI_MONTHLY_CREDIT_CAP).optional(),
)

const optionalUrlSchema = (name: string, protocols: ReadonlyArray<string>) =>
  optionalStringSchema.superRefine((value, context) => {
    if (value === undefined) {
      return
    }

    let url: URL
    try {
      url = new URL(value)
    } catch {
      context.addIssue({code: 'custom', message: `${name} must be a valid URL`})
      return
    }

    if (!protocols.includes(url.protocol)) {
      context.addIssue({
        code: 'custom',
        message: `${name} must use ${protocols.join(' or ')}`,
      })
    }
  })

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
  POMO_AI_ARTIFACT_R2_ACCESS_KEY_ID: optionalStringSchema,
  POMO_AI_ARTIFACT_R2_BUCKET: optionalStringSchema,
  POMO_AI_ARTIFACT_R2_PREFIX: optionalStringSchema,
  POMO_AI_ARTIFACT_R2_SECRET_ACCESS_KEY: optionalStringSchema,
  POMO_AI_CREDIT_PROFILE_JSON: optionalStringSchema,
  POMO_AI_MONTHLY_CREDIT_CAP: optionalMonthlyCreditCapSchema,
  POMO_AI_QUEUE_LIMIT: defaultedIntegerSchema(
    DEFAULT_AI_QUEUE_LIMIT,
    1,
    MAXIMUM_AI_MONTHLY_CREDIT_CAP,
  ),
  POMO_AI_RUNNER_TIMEOUT_MS: defaultedIntegerSchema(
    DEFAULT_AI_RUNNER_TIMEOUT_MS,
    MINIMUM_AI_RUNNER_TIMEOUT_MS,
    MAXIMUM_AI_RUNNER_TIMEOUT_MS,
  ),
  POMO_AI_RUNNER_TOKEN: optionalStringSchema,
  POMO_AI_RUNNER_URL: optionalUrlSchema('POMO_AI_RUNNER_URL', ['https:']),
  POMO_AI_STORAGE_QUOTA_BYTES: optionalPositiveIntegerSchema,
  POMO_AI_SUBSCRIPTION_PRODUCT_CODE: defaultedStringSchema('pomo-ai-service'),
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
