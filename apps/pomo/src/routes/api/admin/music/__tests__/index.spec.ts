import {beforeEach, expect, it, vi} from 'vitest'

const authMocks = vi.hoisted(() => ({authorizeAdminRequest: vi.fn()}))
const repositoryMocks = vi.hoisted(() => ({listAdminMusic: vi.fn()}))

vi.mock('src/server/admin-auth/http', () => authMocks)
vi.mock('src/server/music/admin-repository', () => repositoryMocks)

import {GET} from '../index'
import {invokeApiRoute} from '../../../__tests__/invoke'

beforeEach(() => {
  vi.restoreAllMocks()
  authMocks.authorizeAdminRequest.mockReset().mockResolvedValue({
    authorized: true,
    cookies: ['admin=refreshed'],
  })
  repositoryMocks.listAdminMusic.mockReset()
})

it('should return the authorization response before listing music', async () => {
  authMocks.authorizeAdminRequest.mockResolvedValue({
    authorized: false,
    response: Response.json({error: 'forbidden'}, {status: 403}),
  })

  const response = await invokeApiRoute(GET, new Request('https://pomo.example/api/admin/music'))

  expect(response.status).toBe(403)
  expect(repositoryMocks.listAdminMusic).not.toHaveBeenCalled()
})

it('should return the admin music catalog with refreshed cookies', async () => {
  repositoryMocks.listAdminMusic.mockResolvedValue({albums: [], tracks: []})

  const response = await invokeApiRoute(GET, new Request('https://pomo.example/api/admin/music'))

  expect(response.status).toBe(200)
  expect(response.headers.getSetCookie()).toEqual(['admin=refreshed'])
  await expect(response.json()).resolves.toEqual({albums: [], tracks: []})
})

it('should return an internal error when the catalog cannot be listed', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  repositoryMocks.listAdminMusic.mockRejectedValue(new Error('database unavailable'))

  const response = await invokeApiRoute(GET, new Request('https://pomo.example/api/admin/music'))

  expect(response.status).toBe(500)
  await expect(response.json()).resolves.toEqual({error: 'music_list_failed'})
})
