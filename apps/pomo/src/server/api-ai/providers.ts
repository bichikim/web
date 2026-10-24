import {z} from 'zod'
import {env} from 'src/env'
import {CLOUD_TEXT_MODEL} from 'src/features/cloud-text/contracts'
import {hasUniqueIds} from 'src/features/catalog-policy'
import type {ApiAiProvider} from './types'

const MAXIMUM_POOL_ID_LENGTH = 128

const providerFields = {
  apiKeyEnv: z.string().regex(/^[A-Z][A-Z0-9_]*$/u),
  baseUrl: z
    .url()
    .refine(
      (value) =>
        new URL(value).protocol === 'https:' &&
        new URL(value).username === '' &&
        new URL(value).password === '',
    ),
  id: z.string().regex(/^[a-z][a-z0-9-]{0,63}$/u),
  models: z
    .object({'cloud-text': z.string().min(1).optional(), history: z.string().min(1).optional()})
    .refine((models) => Object.values(models).length > 0),
  poolId: z.string().min(1).max(MAXIMUM_POOL_ID_LENGTH),
}
const providerSchema = z.discriminatedUnion('protocol', [
  z.object({
    ...providerFields,
    protocol: z.literal('openai-responses-background'),
    webhookSecretEnv: z.string().regex(/^[A-Z][A-Z0-9_]*$/u),
  }),
  z.object({
    ...providerFields,
    baseUrl: z.literal('https://openrouter.ai/api/v1'),
    models: z.object({'cloud-text': z.string().min(1)}).strict(),
    protocol: z.literal('openrouter-responses-queue'),
  }),
])

/** Resolves the available provider catalog from server-only credentials. */
export const getConfiguredApiAiProviders = (): ReadonlyArray<ApiAiProvider> => {
  const configured = env.POMO_API_AI_PROVIDERS_JSON
  const definitions =
    configured === undefined ? [] : z.array(providerSchema).parse(JSON.parse(configured))
  const routerKey = (env.OPENROUTER_API_KEY ?? process.env.OPENROUTER_API_KEY)?.trim()
  const routerConfigured = definitions.some(
    (definition) =>
      definition.id === 'openrouter' ||
      (definition.protocol === 'openrouter-responses-queue' &&
        definition.apiKeyEnv === 'OPENROUTER_API_KEY'),
  )
  const providers: ReadonlyArray<ApiAiProvider> = [
    {
      apiKey: env.OPENAI_API_KEY,
      baseUrl: 'https://api.openai.com/v1',
      id: 'openai',
      models: {'cloud-text': CLOUD_TEXT_MODEL, history: env.OPENAI_MODEL},
      poolId: env.POMO_API_AI_POOL_ID,
      protocol: 'openai-responses-background',
      webhookSecret: env.OPENAI_WEBHOOK_SECRET,
    },
    ...definitions.map((definition): ApiAiProvider => {
      const apiKey = (
        process.env[definition.apiKeyEnv] ??
        (definition.apiKeyEnv === 'OPENROUTER_API_KEY' ? env.OPENROUTER_API_KEY : undefined)
      )?.trim()
      const webhookSecret =
        definition.protocol === 'openai-responses-background'
          ? process.env[definition.webhookSecretEnv]?.trim()
          : undefined
      if (!apiKey || (definition.protocol === 'openai-responses-background' && !webhookSecret)) {
        throw new TypeError(`AI provider credentials are missing: ${definition.id}`)
      }
      return {...definition, apiKey, webhookSecret}
    }),
    ...(routerKey && !routerConfigured
      ? [
          {
            apiKey: routerKey,
            baseUrl: 'https://openrouter.ai/api/v1',
            id: 'openrouter',
            models: {'cloud-text': 'google/gemma-4-26b-a4b-it:free'},
            poolId: 'openrouter:default',
            protocol: 'openrouter-responses-queue' as const,
          },
        ]
      : []),
  ]
  if (!hasUniqueIds(providers.map((provider) => provider.id))) {
    throw new TypeError('AI provider IDs must be unique')
  }
  return providers
}

/** Preserves the environment-selected execution order until an administrator saves a policy. */
export const getApiAiProviders = (): ReadonlyArray<ApiAiProvider> => {
  const providers = getConfiguredApiAiProviders()
  const selected = env.POMO_API_AI_CLOUD_TEXT_PROVIDER
  if (
    selected !== undefined &&
    !providers.some(
      (provider) => provider.id === selected && provider.models['cloud-text'] !== undefined,
    )
  ) {
    throw new TypeError(`AI cloud-text provider is not configured: ${selected}`)
  }
  return providers.map((provider) => {
    const enabled =
      selected === undefined
        ? provider.protocol !== 'openrouter-responses-queue'
        : provider.id === selected
    if (enabled) {
      return provider
    }
    const {history} = provider.models
    return {...provider, models: history === undefined ? {} : {history}}
  })
}
