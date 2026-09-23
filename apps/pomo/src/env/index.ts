import type {z} from 'zod'

import {readServerEnv} from './read-server'
import {envSchema} from './schema'

export * from './read-server'
export * from './schema'

export type ServerEnv = z.output<z.ZodObject<typeof envSchema>>

// Keys must stay aligned with envSchema. A static check is deferred.
// List each key; Vite replaces import.meta.env.KEY only and does not expand a spread.
const GOOGLE_CALENDAR_CLIENT_ID =
  process.env.GOOGLE_CALENDAR_CLIENT_ID ?? import.meta.env.GOOGLE_CALENDAR_CLIENT_ID
const GOOGLE_CALENDAR_CLIENT_SECRET =
  process.env.GOOGLE_CALENDAR_CLIENT_SECRET ?? import.meta.env.GOOGLE_CALENDAR_CLIENT_SECRET
const MICROSOFT_CALENDAR_CLIENT_ID =
  process.env.MICROSOFT_CALENDAR_CLIENT_ID ?? import.meta.env.MICROSOFT_CALENDAR_CLIENT_ID
const MICROSOFT_CALENDAR_CLIENT_SECRET =
  process.env.MICROSOFT_CALENDAR_CLIENT_SECRET ?? import.meta.env.MICROSOFT_CALENDAR_CLIENT_SECRET
const POMO_CALENDAR_TOKEN_ENCRYPTION_KEY =
  process.env.POMO_CALENDAR_TOKEN_ENCRYPTION_KEY ??
  import.meta.env.POMO_CALENDAR_TOKEN_ENCRYPTION_KEY
const POMO_AI_ARTIFACT_R2_ACCESS_KEY_ID =
  process.env.POMO_AI_ARTIFACT_R2_ACCESS_KEY_ID ?? import.meta.env.POMO_AI_ARTIFACT_R2_ACCESS_KEY_ID
const POMO_AI_ARTIFACT_R2_BUCKET =
  process.env.POMO_AI_ARTIFACT_R2_BUCKET ?? import.meta.env.POMO_AI_ARTIFACT_R2_BUCKET
const POMO_AI_ARTIFACT_R2_PREFIX =
  process.env.POMO_AI_ARTIFACT_R2_PREFIX ?? import.meta.env.POMO_AI_ARTIFACT_R2_PREFIX
const POMO_AI_ARTIFACT_R2_SECRET_ACCESS_KEY =
  process.env.POMO_AI_ARTIFACT_R2_SECRET_ACCESS_KEY ??
  import.meta.env.POMO_AI_ARTIFACT_R2_SECRET_ACCESS_KEY
const POMO_AI_CREDIT_PROFILE_JSON =
  process.env.POMO_AI_CREDIT_PROFILE_JSON ?? import.meta.env.POMO_AI_CREDIT_PROFILE_JSON
const POMO_AI_MONTHLY_CREDIT_CAP =
  process.env.POMO_AI_MONTHLY_CREDIT_CAP ?? import.meta.env.POMO_AI_MONTHLY_CREDIT_CAP
const POMO_AI_QUEUE_LIMIT = process.env.POMO_AI_QUEUE_LIMIT ?? import.meta.env.POMO_AI_QUEUE_LIMIT
const POMO_AI_RUNNER_TIMEOUT_MS =
  process.env.POMO_AI_RUNNER_TIMEOUT_MS ?? import.meta.env.POMO_AI_RUNNER_TIMEOUT_MS
const POMO_AI_RUNNER_TOKEN =
  process.env.POMO_AI_RUNNER_TOKEN ?? import.meta.env.POMO_AI_RUNNER_TOKEN
const POMO_AI_RUNNER_URL = process.env.POMO_AI_RUNNER_URL ?? import.meta.env.POMO_AI_RUNNER_URL
const POMO_AI_STORAGE_QUOTA_BYTES =
  process.env.POMO_AI_STORAGE_QUOTA_BYTES ?? import.meta.env.POMO_AI_STORAGE_QUOTA_BYTES
const POMO_AI_SUBSCRIPTION_PRODUCT_CODE =
  process.env.POMO_AI_SUBSCRIPTION_PRODUCT_CODE ?? import.meta.env.POMO_AI_SUBSCRIPTION_PRODUCT_CODE
const readRuntimeEnv = (): ServerEnv =>
  readServerEnv(envSchema, {
    CRON_SECRET: process.env.CRON_SECRET ?? import.meta.env.CRON_SECRET,
    DATABASE_URL: process.env.DATABASE_URL ?? import.meta.env.DATABASE_URL,
    GOOGLE_CALENDAR_CLIENT_ID,
    GOOGLE_CALENDAR_CLIENT_SECRET,
    KMA_SERVICE_KEY: process.env.KMA_SERVICE_KEY ?? import.meta.env.KMA_SERVICE_KEY,
    MICROSOFT_CALENDAR_CLIENT_ID,
    MICROSOFT_CALENDAR_CLIENT_SECRET,
    NEON_AUTH_BASE_URL: process.env.NEON_AUTH_BASE_URL ?? import.meta.env.NEON_AUTH_BASE_URL,
    NEON_AUTH_COOKIE_SECRET:
      process.env.NEON_AUTH_COOKIE_SECRET ?? import.meta.env.NEON_AUTH_COOKIE_SECRET,
    NODE_ENV: process.env.NODE_ENV ?? import.meta.env.NODE_ENV,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? import.meta.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL ?? import.meta.env.OPENAI_MODEL,
    OPENAI_REASONING_EFFORT:
      process.env.OPENAI_REASONING_EFFORT ?? import.meta.env.OPENAI_REASONING_EFFORT,
    OPENAI_SERVICE_TIER: process.env.OPENAI_SERVICE_TIER ?? import.meta.env.OPENAI_SERVICE_TIER,
    OPENAI_WEBHOOK_SECRET:
      process.env.OPENAI_WEBHOOK_SECRET ?? import.meta.env.OPENAI_WEBHOOK_SECRET,
    OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY ?? import.meta.env.OPENWEATHER_API_KEY,
    POMO_AI_ARTIFACT_R2_ACCESS_KEY_ID,
    POMO_AI_ARTIFACT_R2_BUCKET,
    POMO_AI_ARTIFACT_R2_PREFIX,
    POMO_AI_ARTIFACT_R2_SECRET_ACCESS_KEY,
    POMO_AI_CREDIT_PROFILE_JSON,
    POMO_AI_MONTHLY_CREDIT_CAP,
    POMO_AI_QUEUE_LIMIT,
    POMO_AI_RUNNER_TIMEOUT_MS,
    POMO_AI_RUNNER_TOKEN,
    POMO_AI_RUNNER_URL,
    POMO_AI_STORAGE_QUOTA_BYTES,
    POMO_AI_SUBSCRIPTION_PRODUCT_CODE,
    POMO_CALENDAR_TOKEN_ENCRYPTION_KEY,
    POMO_TOSS_CALLBACK_AUTHORIZATION:
      process.env.POMO_TOSS_CALLBACK_AUTHORIZATION ??
      import.meta.env.POMO_TOSS_CALLBACK_AUTHORIZATION,
    POMO_TOSS_MTLS_CERT: process.env.POMO_TOSS_MTLS_CERT ?? import.meta.env.POMO_TOSS_MTLS_CERT,
    POMO_TOSS_MTLS_KEY: process.env.POMO_TOSS_MTLS_KEY ?? import.meta.env.POMO_TOSS_MTLS_KEY,
    VERCEL_ENV: process.env.VERCEL_ENV ?? import.meta.env.VERCEL_ENV,
  })

export const env: ServerEnv = readRuntimeEnv()
