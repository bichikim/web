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
})
