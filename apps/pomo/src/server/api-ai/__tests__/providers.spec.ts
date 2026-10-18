/** @vitest-environment node */
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
const environment = vi.hoisted(() => ({
  OPENAI_API_KEY: 'primary-key',
  OPENAI_MODEL: 'history-model',
  OPENAI_WEBHOOK_SECRET: 'primary-secret',
  POMO_API_AI_CLOUD_TEXT_PROVIDER: undefined as string | undefined,
  POMO_API_AI_POOL_ID: 'primary',
  POMO_API_AI_PROVIDERS_JSON: undefined as string | undefined,
}))
vi.mock('src/env', () => ({env: environment}))
import {getApiAiProviders, getConfiguredApiAiProviders} from '../providers'
const secondary = {
  apiKeyEnv: 'SECONDARY_AI_API_KEY',
  baseUrl: 'https://secondary.example/v1',
  id: 'secondary',
  models: {'cloud-text': 'text-model'},
  poolId: 'secondary',
  protocol: 'openai-responses-background',
  webhookSecretEnv: 'SECONDARY_AI_WEBHOOK_SECRET',
}
beforeEach(() => {
  environment.POMO_API_AI_PROVIDERS_JSON = undefined
  environment.POMO_API_AI_CLOUD_TEXT_PROVIDER = undefined
  vi.stubEnv('SECONDARY_AI_API_KEY', 'secondary-key')
  vi.stubEnv('OPENROUTER_API_KEY', '')
  vi.stubEnv('SECONDARY_AI_WEBHOOK_SECRET', 'secondary-secret')
})
it('should discover a registered OpenRouter key without changing the environment default', () => {
  vi.stubEnv('OPENROUTER_API_KEY', 'router-key')
  expect(getConfiguredApiAiProviders().map((provider) => provider.id)).toEqual([
    'openai',
    'openrouter',
  ])
  expect(getApiAiProviders()[1].models['cloud-text']).toBeUndefined()
  environment.POMO_API_AI_CLOUD_TEXT_PROVIDER = 'openrouter'
  expect(getApiAiProviders()[1].models['cloud-text']).toBe('google/gemma-4-26b-a4b-it:free')
})
afterEach(() => {
  vi.unstubAllEnvs()
})
it('should preserve the existing OpenAI provider when no fallback is configured', () => {
  expect(getApiAiProviders()).toMatchObject([
    {apiKey: 'primary-key', id: 'openai', poolId: 'primary'},
  ])
})
it('should resolve additional providers in order using server-only credentials', () => {
  environment.POMO_API_AI_PROVIDERS_JSON = JSON.stringify([secondary])
  expect(getApiAiProviders().map((provider) => provider.id)).toEqual(['openai', 'secondary'])
  expect(getApiAiProviders()[1]).toMatchObject({
    apiKey: 'secondary-key',
    models: {'cloud-text': 'text-model'},
    webhookSecret: 'secondary-secret',
  })
})
it('should reject duplicate provider identities', () => {
  environment.POMO_API_AI_PROVIDERS_JSON = JSON.stringify([{...secondary, id: 'openai'}])
  expect(getApiAiProviders).toThrow('unique')
})
it('should reject repeated fallback identities with the catalog error', () => {
  environment.POMO_API_AI_PROVIDERS_JSON = JSON.stringify([
    secondary,
    {...secondary, poolId: 'another-pool'},
  ])
  expect(getConfiguredApiAiProviders).toThrow(TypeError)
  expect(getConfiguredApiAiProviders).toThrow(new TypeError('AI provider IDs must be unique'))
})
it('should resolve later credentials before rejecting earlier duplicate identities', () => {
  environment.POMO_API_AI_PROVIDERS_JSON = JSON.stringify([
    secondary,
    secondary,
    {...secondary, apiKeyEnv: 'UNAVAILABLE_AI_API_KEY', id: 'unavailable'},
  ])
  vi.stubEnv('UNAVAILABLE_AI_API_KEY', '')
  expect(getConfiguredApiAiProviders).toThrow(TypeError)
  expect(getConfiguredApiAiProviders).toThrow(
    new TypeError('AI provider credentials are missing: unavailable'),
  )
})
it('should ignore legacy limit settings for a shared provider pool', () => {
  environment.POMO_API_AI_PROVIDERS_JSON = JSON.stringify([
    {...secondary, concurrency: 1, poolId: 'primary', requestsPerMinute: 1},
  ])
  expect(getApiAiProviders().map((provider) => provider.id)).toEqual(['openai', 'secondary'])
  expect(getApiAiProviders()[1]).not.toHaveProperty('concurrency')
})
it('should require credentials and a webhook contract before enabling a fallback', () => {
  environment.POMO_API_AI_PROVIDERS_JSON = JSON.stringify([secondary])
  vi.stubEnv('SECONDARY_AI_WEBHOOK_SECRET', '')
  expect(getApiAiProviders).toThrow('credentials are missing')
})
it('should reject a synchronous-only protocol', () => {
  environment.POMO_API_AI_PROVIDERS_JSON = JSON.stringify([
    {...secondary, protocol: 'chat-completions'},
  ])
  expect(getApiAiProviders).toThrow()
})

const openRouter = {
  apiKeyEnv: 'OPENROUTER_API_KEY',
  baseUrl: 'https://openrouter.ai/api/v1',
  id: 'openrouter',
  models: {'cloud-text': 'google/gemma-4-26b-a4b-it:free'},
  poolId: 'openrouter:default',
  protocol: 'openrouter-responses-queue',
}

it('should select OpenRouter for tarot without enabling a paid fallback or requiring a webhook', () => {
  vi.stubEnv('OPENROUTER_API_KEY', 'router-key')
  environment.POMO_API_AI_CLOUD_TEXT_PROVIDER = 'openrouter'
  environment.POMO_API_AI_PROVIDERS_JSON = JSON.stringify([openRouter])
  const providers = getApiAiProviders()
  expect(providers[0].models).toEqual({history: 'history-model'})
  expect(providers[1]).toMatchObject({
    apiKey: 'router-key',
    protocol: 'openrouter-responses-queue',
  })
  expect(providers[1].webhookSecret).toBeUndefined()
})

it('should keep an unselected OpenRouter provider out of the existing fallback chain', () => {
  vi.stubEnv('OPENROUTER_API_KEY', 'router-key')
  environment.POMO_API_AI_PROVIDERS_JSON = JSON.stringify([openRouter])
  expect(getApiAiProviders()[1].models['cloud-text']).toBeUndefined()
})

it('should not create another pool for a canonical key already configured under a custom provider ID', () => {
  vi.stubEnv('OPENROUTER_API_KEY', 'router-key')
  environment.POMO_API_AI_PROVIDERS_JSON = JSON.stringify([
    {...openRouter, id: 'router-custom', poolId: 'router-account'},
  ])
  expect(getConfiguredApiAiProviders().map((provider) => provider.id)).toEqual([
    'openai',
    'router-custom',
  ])
})

it('should reject a missing selected provider and unsupported queued history generation', () => {
  environment.POMO_API_AI_CLOUD_TEXT_PROVIDER = 'missing'
  expect(getApiAiProviders).toThrow('cloud-text provider')
  vi.stubEnv('OPENROUTER_API_KEY', 'router-key')
  environment.POMO_API_AI_CLOUD_TEXT_PROVIDER = undefined
  environment.POMO_API_AI_PROVIDERS_JSON = JSON.stringify([
    {...openRouter, models: {history: 'model'}},
  ])
  expect(getApiAiProviders).toThrow()
})
