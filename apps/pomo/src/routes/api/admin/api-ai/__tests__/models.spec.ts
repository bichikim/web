/** @vitest-environment node */
import {beforeEach, expect, it, vi} from 'vitest'
import {authorizeAdminRequest} from 'src/server/auth/authorize-admin-request'
import {readAdminApiAiPage, updateApiAiCatalog} from 'src/server/repositories/api-ai/routing'
import {invokeApiRoute} from '../../../__tests__/invoke'
import {POST} from '../models'
vi.mock('src/server/auth/authorize-admin-request', () => ({authorizeAdminRequest: vi.fn()}))
vi.mock('src/server/repositories/api-ai/routing', () => ({
  readAdminApiAiPage: vi.fn(),
  updateApiAiCatalog: vi.fn(),
}))
vi.mock('src/server/api-ai/providers', () => ({
  getApiAiProviders: vi.fn(),
  getConfiguredApiAiProviders: vi.fn(),
}))
const request = (body: unknown) =>
  new Request('https://pomo.example/api/admin/api-ai/models', {
    body: JSON.stringify(body),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })
const update = {
  entry: {label: '', model: 'gemma', providerId: 'openrouter'},
  operation: 'register',
  revision: 1,
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(authorizeAdminRequest).mockResolvedValue({authorized: true, cookies: ['admin=1']})
  vi.mocked(updateApiAiCatalog).mockResolvedValue('saved')
})
it('should reject non-administrators before changing model registrations', async () => {
  vi.mocked(authorizeAdminRequest).mockResolvedValue({
    authorized: false,
    response: Response.json({}, {status: 403}),
  })
  expect((await invokeApiRoute(POST, request(update))).status).toBe(403)
  expect(updateApiAiCatalog).not.toHaveBeenCalled()
})
it('should validate registration and expose revision conflicts', async () => {
  expect((await invokeApiRoute(POST, request({...update, revision: -1}))).status).toBe(400)
  expect(updateApiAiCatalog).not.toHaveBeenCalled()
  vi.mocked(updateApiAiCatalog).mockResolvedValue('conflict')
  expect((await invokeApiRoute(POST, request(update))).status).toBe(409)
})
it('should return the refreshed private catalog and preserve authentication cookies', async () => {
  vi.mocked(readAdminApiAiPage).mockResolvedValue({
    catalog: [],
    providers: [],
    revision: 2,
    routes: [{model: 'gemma', providerId: 'openrouter'}],
    source: 'admin',
  })
  const response = await invokeApiRoute(POST, request(update))
  expect(response.status).toBe(200)
  expect(response.headers.getSetCookie()).toEqual(['admin=1'])
  expect(response.headers.get('Cache-Control')).toContain('no-store')
  expect(await response.json()).toMatchObject({revision: 2})
})
