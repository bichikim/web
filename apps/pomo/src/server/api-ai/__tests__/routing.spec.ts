/** @vitest-environment node */
import {expect, it} from 'vitest'
import {apiAiRoutesSchema} from 'src/features/admin-api-ai/contracts'
import {resolveApiAiRoutes, validateApiAiRouting} from '../routing'
import type {ApiAiProvider} from '../types'
const providers: ReadonlyArray<ApiAiProvider> = [
  {
    apiKey: 'secret',
    baseUrl: 'https://api.openai.com/v1',
    id: 'openai',
    models: {'cloud-text': 'gpt-6-luna', history: 'gpt-6-luna'},
    poolId: 'openai',
    protocol: 'openai-responses-background',
  },
  {
    apiKey: 'router-secret',
    baseUrl: 'https://openrouter.ai/api/v1',
    id: 'openrouter',
    models: {'cloud-text': 'google/gemma-4-26b-a4b-it:free'},
    poolId: 'router',
    protocol: 'openrouter-responses-queue',
  },
]
const routes = [
  {model: 'google/gemma-4-26b-a4b-it:free', providerId: 'openrouter'},
  {model: 'gpt-6-luna', providerId: 'openai'},
]
it('should preserve the configured model order without mutating credential-bearing providers', () => {
  expect(
    resolveApiAiRoutes(providers, routes, 'cloud-text').map((provider) => provider.id),
  ).toEqual(['openrouter', 'openai'])
  expect(providers[0].models['cloud-text']).toBe('gpt-6-luna')
})
it('should allow the configured paid fallback without a separate price gate', () => {
  expect(validateApiAiRouting(providers, {routes})).toBe('valid')
})
it('should reject an unsupported history provider and duplicate model steps', () => {
  expect(() => resolveApiAiRoutes(providers, routes, 'history')).toThrow('does not support history')
  expect(apiAiRoutesSchema.safeParse([routes[0], routes[0]]).success).toBe(false)
})
