import {beforeEach, expect, it, vi} from 'vitest'

const {readBearerToken, resolveAppSessionUserId} = vi.hoisted(() => ({
  readBearerToken: vi.fn(),
  resolveAppSessionUserId: vi.fn(),
}))

vi.mock('../repository', () => ({resolveAppSessionUserId}))
vi.mock('../token', () => ({readBearerToken}))

import {authenticateAppRequest} from '../http'

const request = new Request('https://example.com')

beforeEach(() => {
  vi.clearAllMocks()
})

it('should reject a request without a bearer token', async () => {
  readBearerToken.mockReturnValue(null)

  await expect(authenticateAppRequest(request)).resolves.toBeNull()
  expect(resolveAppSessionUserId).not.toHaveBeenCalled()
})

it('should reject an expired or unknown app session', async () => {
  readBearerToken.mockReturnValue('token')
  resolveAppSessionUserId.mockResolvedValue(null)

  await expect(authenticateAppRequest(request)).resolves.toBeNull()
})

it('should return the authenticated app identity', async () => {
  readBearerToken.mockReturnValue('token')
  resolveAppSessionUserId.mockResolvedValue('user-id')

  await expect(authenticateAppRequest(request)).resolves.toEqual({
    token: 'token',
    userId: 'user-id',
  })
})
