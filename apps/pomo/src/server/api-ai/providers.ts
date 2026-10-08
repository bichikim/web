import {z} from 'zod'
import {env} from 'src/env'
import {CLOUD_TEXT_MODEL} from 'src/features/cloud-text/contracts'
import type {ApiAiProvider} from './types'

const MAXIMUM_CONCURRENCY = 1000
const MAXIMUM_POOL_ID_LENGTH = 128

const providerSchema = z.object({
  apiKeyEnv: z.string().regex(/^[A-Z][A-Z0-9_]*$/u),
  baseUrl: z
    .url()
    .refine(
      (value) =>
        new URL(value).protocol === 'https:' &&
        new URL(value).username === '' &&
        new URL(value).password === '',
    ),
  concurrency: z.number().int().min(1).max(MAXIMUM_CONCURRENCY),
  id: z.string().regex(/^[a-z][a-z0-9-]{0,63}$/u),
  models: z
    .object({'cloud-text': z.string().min(1).optional(), history: z.string().min(1).optional()})
    .refine((models) => Object.values(models).length > 0),
  poolId: z.string().min(1).max(MAXIMUM_POOL_ID_LENGTH),
  protocol: z.literal('openai-responses-background'),
  requestsPerMinute: z.number().int().positive().optional(),
  tokensPerMinute: z.number().int().positive().optional(),
  webhookSecretEnv: z.string().regex(/^[A-Z][A-Z0-9_]*$/u),
})

/** Resolves ordered background-capable providers from server-only configuration. */
export const getApiAiProviders = (): ReadonlyArray<ApiAiProvider> => {
  const configured = env.POMO_API_AI_PROVIDERS_JSON
  const definitions =
    configured === undefined ? [] : z.array(providerSchema).parse(JSON.parse(configured))
  const providers: ReadonlyArray<ApiAiProvider> = [
    {
      apiKey: env.OPENAI_API_KEY,
      baseUrl: 'https://api.openai.com/v1',
      concurrency: env.POMO_API_AI_CONCURRENCY,
      id: 'openai',
      models: {'cloud-text': CLOUD_TEXT_MODEL, history: env.OPENAI_MODEL},
      poolId: env.POMO_API_AI_POOL_ID,
      requestsPerMinute: env.POMO_API_AI_REQUESTS_PER_MINUTE,
      tokensPerMinute: env.POMO_API_AI_TOKENS_PER_MINUTE,
      webhookSecret: env.OPENAI_WEBHOOK_SECRET,
    },
    ...definitions.map((definition): ApiAiProvider => {
      const apiKey = process.env[definition.apiKeyEnv]?.trim()
      const webhookSecret = process.env[definition.webhookSecretEnv]?.trim()
      if (!apiKey || !webhookSecret) {
        throw new TypeError(`AI provider credentials are missing: ${definition.id}`)
      }
      return {...definition, apiKey, webhookSecret}
    }),
  ]
  if (new Set(providers.map((provider) => provider.id)).size !== providers.length) {
    throw new TypeError('AI provider IDs must be unique')
  }
  for (const provider of providers) {
    const inconsistent = providers.some(
      (candidate) =>
        candidate.poolId === provider.poolId &&
        (candidate.concurrency !== provider.concurrency ||
          candidate.requestsPerMinute !== provider.requestsPerMinute ||
          candidate.tokensPerMinute !== provider.tokensPerMinute),
    )
    if (inconsistent) {
      throw new TypeError(`AI providers sharing a pool must share limits: ${provider.poolId}`)
    }
  }
  return providers
}
