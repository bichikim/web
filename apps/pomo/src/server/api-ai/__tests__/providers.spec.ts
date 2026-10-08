/** @vitest-environment node */
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
const environment = vi.hoisted(() => ({
  OPENAI_API_KEY: 'primary-key',
  OPENAI_MODEL: 'history-model',
  OPENAI_WEBHOOK_SECRET: 'primary-secret',
  POMO_API_AI_CONCURRENCY: 4,
  POMO_API_AI_POOL_ID: 'primary',
  POMO_API_AI_PROVIDERS_JSON: undefined as string | undefined,
}))
vi.mock('src/env', () => ({env: environment}))
import {getApiAiProviders} from '../providers'
const secondary = {
  apiKeyEnv: 'SECONDARY_AI_API_KEY',
  baseUrl: 'https://secondary.example/v1',
  concurrency: 2,
  id: 'secondary',
  models: {'cloud-text': 'text-model'},
  poolId: 'secondary',
  protocol: 'openai-responses-background',
  webhookSecretEnv: 'SECONDARY_AI_WEBHOOK_SECRET',
}
beforeEach(() => {
  environment.POMO_API_AI_PROVIDERS_JSON = undefined
  vi.stubEnv('SECONDARY_AI_API_KEY', 'secondary-key')
  vi.stubEnv('SECONDARY_AI_WEBHOOK_SECRET', 'secondary-secret')
})
afterEach(() => {
  vi.unstubAllEnvs()
})
it('should preserve the existing OpenAI provider when no fallback is configured', () => {
  expect(getApiAiProviders()).toMatchObject([
    {apiKey: 'primary-key', concurrency: 4, id: 'openai', poolId: 'primary'},
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
it('should reject conflicting limits for a shared provider pool', () => {
  environment.POMO_API_AI_PROVIDERS_JSON = JSON.stringify([{...secondary, poolId: 'primary'}])
  expect(getApiAiProviders).toThrow('share limits')
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
