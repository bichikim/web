import {beforeEach, describe, expect, it, vi} from 'vitest'

const sessionMocks = vi.hoisted(() => ({getNeonSession: vi.fn()}))
const repositoryMocks = vi.hoisted(() => ({completeAccountLink: vi.fn()}))

vi.mock('src/server/user-auth/neon-session', () => sessionMocks)
vi.mock('src/server/user-auth/repository', () => repositoryMocks)

import {POST} from '../complete-link'
import {invokeApiRoute} from '../../__tests__/invoke'

const createRequest = (): Request =>
  new Request('https://www.pomofi.io/api/account/complete-link', {
    body: JSON.stringify({token: 'a'.repeat(43)}),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })

const createRequestWithBody = (body: string): Request =>
  new Request('https://www.pomofi.io/api/account/complete-link', {
    body,
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })

describe('complete account link route', () => {
  beforeEach(() => {
    sessionMocks.getNeonSession.mockReset().mockResolvedValue({
      cookies: [],
      identity: {email: 'User@Example.com', id: 'neon-user-id'},
    })
    repositoryMocks.completeAccountLink.mockReset().mockResolvedValue({
      status: 'linked',
      userId: 'pomo-user-id',
    })
  })

  it('should require the authenticated Neon email when consuming the challenge', async () => {
    const response = await invokeApiRoute(POST, createRequest())

    expect(response.status).toBe(200)
    expect(repositoryMocks.completeAccountLink).toHaveBeenCalledWith(
      'a'.repeat(43),
      'neon-user-id',
      'User@Example.com',
    )
  })

  it('should reject invalid and oversized challenge requests', async () => {
    const invalidResponse = await invokeApiRoute(
      POST,
      createRequestWithBody(JSON.stringify({token: 'short'})),
    )
    const oversizedResponse = await invokeApiRoute(POST, createRequestWithBody('x'.repeat(4097)))

    expect(invalidResponse.status).toBe(400)
    await expect(invalidResponse.json()).resolves.toEqual({error: 'invalid_challenge'})
    expect(oversizedResponse.status).toBe(413)
    await expect(oversizedResponse.json()).resolves.toEqual({error: 'invalid_challenge'})
    expect(sessionMocks.getNeonSession).not.toHaveBeenCalled()
  })

  it('should require an authenticated session', async () => {
    sessionMocks.getNeonSession.mockResolvedValue({
      cookies: ['session=; Max-Age=0'],
      identity: null,
    })

    const response = await invokeApiRoute(POST, createRequest())

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({error: 'unauthorized'})
    expect(response.headers.getSetCookie()).toEqual(['session=; Max-Age=0'])
    expect(repositoryMocks.completeAccountLink).not.toHaveBeenCalled()
  })

  it.each([
    ['identity-conflict', 409, 'identity_conflict'],
    ['invalid-challenge', 410, 'invalid_challenge'],
  ] as const)('should map %s results to an HTTP error', async (status, expectedStatus, error) => {
    repositoryMocks.completeAccountLink.mockResolvedValue({status})

    const response = await invokeApiRoute(POST, createRequest())

    expect(response.status).toBe(expectedStatus)
    await expect(response.json()).resolves.toEqual({error})
  })

  it('should preserve runtime exhaustiveness for unknown repository results', async () => {
    const unknownResult = {status: 'future-status'}
    repositoryMocks.completeAccountLink.mockResolvedValue(unknownResult)

    const response = await invokeApiRoute(POST, createRequest())

    await expect(response.json()).resolves.toEqual(unknownResult)
  })
})
