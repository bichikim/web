import {beforeEach, expect, it, vi} from 'vitest'

const {getAppSessionUserId, readBearerToken} = vi.hoisted(() => ({
  getAppSessionUserId: vi.fn(),
  readBearerToken: vi.fn(),
}))

vi.mock('../repository', () => ({getAppSessionUserId}))
vi.mock('../token', () => ({readBearerToken}))

import {authenticateAppRequest} from '../http'

const request = new Request('https://example.com')

beforeEach(() => {
  vi.clearAllMocks()
})

it('should reject a request without a bearer token', async () => {
  readBearerToken.mockReturnValue(null)

  await expect(authenticateAppRequest(request)).resolves.toBeNull()
  expect(getAppSessionUserId).not.toHaveBeenCalled()
})

it('should reject a pending, expired, or unknown app session', async () => {
  readBearerToken.mockReturnValue('token')
  getAppSessionUserId.mockResolvedValue(null)

  await expect(authenticateAppRequest(request)).resolves.toBeNull()
  expect(getAppSessionUserId).toHaveBeenCalledWith('token')
})

it('should return the authenticated app identity', async () => {
  readBearerToken.mockReturnValue('token')
  getAppSessionUserId.mockResolvedValue('user-id')

  await expect(authenticateAppRequest(request)).resolves.toEqual({
    token: 'token',
    userId: 'user-id',
  })
})
