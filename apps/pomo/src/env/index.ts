import type {z} from 'zod'

import {readServerEnv} from './read-server'
import {envSchema} from './schema'

export * from './allowed'
export * from './pem'
export * from './postgres-url'
export * from './read-server'
export * from './required'
export * from './schema'
export * from './url'

export type ServerEnv = z.output<z.ZodObject<typeof envSchema>>

// Keys must stay aligned with envSchema. A static check is deferred.
// List each key; Vite replaces import.meta.env.KEY only and does not expand a spread.
const readRuntimeEnv = (): ServerEnv =>
  readServerEnv(envSchema, {
    CRON_SECRET: process.env.CRON_SECRET ?? import.meta.env.CRON_SECRET,
    DATABASE_URL: process.env.DATABASE_URL ?? import.meta.env.DATABASE_URL,
    KMA_SERVICE_KEY: process.env.KMA_SERVICE_KEY ?? import.meta.env.KMA_SERVICE_KEY,
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
    POMO_TOSS_CALLBACK_AUTHORIZATION:
      process.env.POMO_TOSS_CALLBACK_AUTHORIZATION ??
      import.meta.env.POMO_TOSS_CALLBACK_AUTHORIZATION,
    POMO_TOSS_MTLS_CERT: process.env.POMO_TOSS_MTLS_CERT ?? import.meta.env.POMO_TOSS_MTLS_CERT,
    POMO_TOSS_MTLS_KEY: process.env.POMO_TOSS_MTLS_KEY ?? import.meta.env.POMO_TOSS_MTLS_KEY,
    VERCEL_ENV: process.env.VERCEL_ENV ?? import.meta.env.VERCEL_ENV,
  })

let parsedEnv: ServerEnv | undefined

const getServerEnv = (): ServerEnv => {
  parsedEnv ??= readRuntimeEnv()

  return parsedEnv
}

export const env: ServerEnv = {} as ServerEnv

for (const key of Object.keys(envSchema) as Array<keyof ServerEnv>) {
  Object.defineProperty(env, key, {
    enumerable: true,
    get: () => getServerEnv()[key],
  })
}
