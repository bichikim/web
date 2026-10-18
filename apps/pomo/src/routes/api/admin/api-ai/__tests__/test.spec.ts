/** @vitest-environment node */
import {beforeEach, expect, it, vi} from 'vitest'
import {authorizeAdminRequest} from 'src/server/auth/authorize-admin-request'
import {getApiAiProviders, getConfiguredApiAiProviders} from 'src/server/api-ai/providers'
import {readAdminApiAiPage} from 'src/server/repositories/api-ai/routing'
import {testProviderModel} from 'src/server/api-ai/test-provider-model'
import {invokeApiRoute} from '../../../__tests__/invoke'
import {POST} from '../test'
vi.mock('src/server/auth/authorize-admin-request', () => ({authorizeAdminRequest: vi.fn()}))
vi.mock('src/server/repositories/api-ai/routing', () => ({readAdminApiAiPage: vi.fn()}))
vi.mock('src/server/api-ai/providers', () => ({
  getApiAiProviders: vi.fn(),
  getConfiguredApiAiProviders: vi.fn(),
}))
vi.mock('src/server/api-ai/test-provider-model', () => ({testProviderModel: vi.fn()}))
const provider = {
  apiKey: 'secret',
  baseUrl: 'https://openrouter.ai/api/v1',
  id: 'openrouter',
  models: {'cloud-text': 'gemma'},
  poolId: 'router',
  protocol: 'openrouter-responses-queue' as const,
}
const request = (body: unknown = {model: 'gemma', providerId: 'openrouter'}) =>
  new Request('https://pomo.example/api/admin/api-ai/test', {
    body: JSON.stringify(body),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(authorizeAdminRequest).mockResolvedValue({authorized: true, cookies: []})
  vi.mocked(getConfiguredApiAiProviders).mockReturnValue([provider])
  vi.mocked(getApiAiProviders).mockReturnValue([provider])
  vi.mocked(readAdminApiAiPage).mockResolvedValue({
    catalog: [{label: '', model: 'gemma', providerId: 'openrouter', removable: false}],
    providers: [],
    revision: 0,
    routes: [{model: 'gemma', providerId: 'openrouter'}],
    source: 'environment',
  })
  vi.mocked(testProviderModel).mockResolvedValue({
    kind: 'success',
    modelId: 'gemma',
    text: '안녕하세요',
    tokenCount: 10,
  })
})
it('should protect paid test calls from unauthorized requests', async () => {
  vi.mocked(authorizeAdminRequest).mockResolvedValue({
    authorized: false,
    response: Response.json({}, {status: 403}),
  })
  expect((await invokeApiRoute(POST, request())).status).toBe(403)
  expect(testProviderModel).not.toHaveBeenCalled()
})
it('should reject unregistered models before invoking a provider', async () => {
  expect(
    (await invokeApiRoute(POST, request({model: 'missing', providerId: 'openrouter'}))).status,
  ).toBe(400)
  expect(testProviderModel).not.toHaveBeenCalled()
})
it('should send one registered model to its provider and return debugging metadata', async () => {
  const response = await invokeApiRoute(POST, request())
  expect(response.headers.get('Cache-Control')).toContain('no-store')
  expect(await response.json()).toMatchObject({
    kind: 'success',
    modelId: 'gemma',
    text: '안녕하세요',
  })
  expect(testProviderModel).toHaveBeenCalledExactlyOnceWith(provider, 'gemma')
})
