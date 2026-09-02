import {beforeEach, expect, it, vi} from 'vitest'

const authMocks = vi.hoisted(() => ({authenticateAppRequest: vi.fn(), readBearerToken: vi.fn()}))
const repositoryMocks = vi.hoisted(() => ({
  resolveAppSessionUserId: vi.fn(),
  revokeAppSession: vi.fn(),
}))

vi.mock('src/server/user-auth/http', () => authMocks)
vi.mock('src/server/user-auth/repository', () => repositoryMocks)
vi.mock('src/server/user-auth/token', () => ({readBearerToken: authMocks.readBearerToken}))

import {DELETE, GET, PATCH} from '../session'
import {invokeApiRoute} from '../../__tests__/invoke'

beforeEach(() => {
  vi.clearAllMocks()
  authMocks.readBearerToken.mockReturnValue(null)
})

it('should activate a pending app session', async () => {
  authMocks.readBearerToken.mockReturnValue('token-1')
  repositoryMocks.resolveAppSessionUserId.mockResolvedValue('user-1')

  const response = await invokeApiRoute(
    PATCH,
    new Request('https://pomo.example/api/app-auth/session', {method: 'PATCH'}),
  )

  expect(response.status).toBe(200)
  await expect(response.json()).resolves.toEqual({authenticated: true})
  expect(repositoryMocks.resolveAppSessionUserId).toHaveBeenCalledWith('token-1')
})

it.each([
  ['missing', null],
  ['invalid', 'invalid-token'],
])('should reject a %s pending session during activation', async (_condition, token) => {
  authMocks.readBearerToken.mockReturnValue(token)
  repositoryMocks.resolveAppSessionUserId.mockResolvedValue(null)

  const response = await invokeApiRoute(
    PATCH,
    new Request('https://pomo.example/api/app-auth/session', {method: 'PATCH'}),
  )

  expect(response.status).toBe(401)
  await expect(response.json()).resolves.toEqual({authenticated: false})
  expect(repositoryMocks.resolveAppSessionUserId).toHaveBeenCalledTimes(token === null ? 0 : 1)
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
