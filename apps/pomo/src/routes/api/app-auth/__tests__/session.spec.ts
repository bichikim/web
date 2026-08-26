import {beforeEach, expect, it, vi} from 'vitest'

const authMocks = vi.hoisted(() => ({authenticateAppRequest: vi.fn()}))
const repositoryMocks = vi.hoisted(() => ({revokeAppSession: vi.fn()}))

vi.mock('src/server/user-auth/http', () => authMocks)
vi.mock('src/server/user-auth/repository', () => repositoryMocks)

import {DELETE, GET} from '../session'
import {invokeApiRoute} from '../../__tests__/invoke'

beforeEach(() => {
  vi.clearAllMocks()
})

it.each([
  ['GET', GET],
  ['DELETE', DELETE],
])('should reject an unauthenticated %s request', async (method, handler) => {
  authMocks.authenticateAppRequest.mockResolvedValue(null)

  const response = await invokeApiRoute(
    handler,
    new Request('https://pomo.example/api/app-auth/session', {method}),
  )

  expect(response.status).toBe(401)
  await expect(response.json()).resolves.toEqual({authenticated: false})
  expect(repositoryMocks.revokeAppSession).not.toHaveBeenCalled()
})

it('should return the authenticated app user', async () => {
  authMocks.authenticateAppRequest.mockResolvedValue({token: 'token-1', userId: 'user-1'})

  const response = await invokeApiRoute(
    GET,
    new Request('https://pomo.example/api/app-auth/session'),
  )

  expect(response.status).toBe(200)
  await expect(response.json()).resolves.toEqual({authenticated: true, userId: 'user-1'})
})

it('should revoke an authenticated app session', async () => {
  authMocks.authenticateAppRequest.mockResolvedValue({token: 'token-1', userId: 'user-1'})
  repositoryMocks.revokeAppSession.mockResolvedValue(undefined)

  const response = await invokeApiRoute(
    DELETE,
    new Request('https://pomo.example/api/app-auth/session', {method: 'DELETE'}),
  )

  expect(response.status).toBe(200)
  await expect(response.json()).resolves.toEqual({authenticated: false})
  expect(repositoryMocks.revokeAppSession).toHaveBeenCalledWith('token-1')
})
