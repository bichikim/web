/** @vitest-environment node */
import {beforeEach, expect, it, vi} from 'vitest'
import {authorizeAdminRequest} from 'src/server/auth/authorize-admin-request'
import {readAdminApiAiPage, updateApiAiRouting} from 'src/server/repositories/api-ai/routing'
import {invokeApiRoute} from '../../../__tests__/invoke'
import {GET, PUT} from '../index'

vi.mock('src/server/auth/authorize-admin-request', () => ({authorizeAdminRequest: vi.fn()}))
vi.mock('src/server/repositories/api-ai/routing', () => ({
  readAdminApiAiPage: vi.fn(),
  updateApiAiRouting: vi.fn(),
}))
vi.mock('src/server/api-ai/providers', () => ({
  getApiAiProviders: () => [],
  getConfiguredApiAiProviders: () => [],
}))
const update = {
  revision: 0,
  routes: [{model: 'gemma:free', providerId: 'openrouter'}],
}
const request = (body: unknown = update) =>
  new Request('https://pomo.example/api/admin/api-ai', {
    body: JSON.stringify(body),
    headers: {'Content-Type': 'application/json'},
    method: 'PUT',
  })
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(authorizeAdminRequest).mockResolvedValue({authorized: true, cookies: ['admin=1']})
  vi.mocked(readAdminApiAiPage).mockResolvedValue({
    ...update,
    catalog: [],

    providers: [],
    source: 'admin',
  })
  vi.mocked(updateApiAiRouting).mockResolvedValue('saved')
})
it('should protect reads and writes before loading any AI configuration', async () => {
  vi.mocked(authorizeAdminRequest).mockResolvedValue({
    authorized: false,
    response: Response.json({}, {status: 403}),
  })
  expect(
    (await invokeApiRoute(GET, new Request('https://pomo.example/api/admin/api-ai'))).status,
  ).toBe(403)
  expect((await invokeApiRoute(PUT, request())).status).toBe(403)
  expect(readAdminApiAiPage).not.toHaveBeenCalled()
  expect(updateApiAiRouting).not.toHaveBeenCalled()
})
it('should reject malformed orders before saving and report conflicting administrator revisions', async () => {
  expect((await invokeApiRoute(PUT, request({...update, routes: []}))).status).toBe(400)
  expect(updateApiAiRouting).not.toHaveBeenCalled()
  vi.mocked(updateApiAiRouting).mockResolvedValue('conflict')
  expect((await invokeApiRoute(PUT, request())).status).toBe(409)
})
it('should return private saved configuration with refreshed cookies', async () => {
  const response = await invokeApiRoute(PUT, request())
  expect(response.status).toBe(200)
  expect(response.headers.getSetCookie()).toEqual(['admin=1'])
  expect(response.headers.get('Cache-Control')).toContain('no-store')
  expect(await response.json()).toMatchObject({source: 'admin'})
})

it('should load the common server order with no-store headers and normalize a repository outage', async () => {
  const response = await invokeApiRoute(GET, new Request('https://pomo.example/api/admin/api-ai'))
  expect(response.status).toBe(200)
  expect(response.headers.get('Cache-Control')).toContain('no-store')
  expect(readAdminApiAiPage).toHaveBeenCalledWith([], [])
  vi.mocked(readAdminApiAiPage).mockRejectedValue(new Error('database unavailable'))
  const logger = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  expect(
    (await invokeApiRoute(GET, new Request('https://pomo.example/api/admin/api-ai'))).status,
  ).toBe(503)
  logger.mockRestore()
})
it('should reject an unsupported model policy and obsolete kind filters', async () => {
  vi.mocked(updateApiAiRouting).mockResolvedValue('invalid')
  expect((await invokeApiRoute(PUT, request())).status).toBe(400)
  expect(
    (await invokeApiRoute(GET, new Request('https://pomo.example/api/admin/api-ai?kind=invalid')))
      .status,
  ).toBe(400)
})
