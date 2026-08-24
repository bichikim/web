import {beforeEach, describe, expect, it, vi} from 'vitest'

const tossAuthMocks = vi.hoisted(() => ({exchangeTossAuthorization: vi.fn()}))
const repositoryMocks = vi.hoisted(() => ({createTossAppSession: vi.fn()}))

vi.mock('src/server/toss-auth/client', () => tossAuthMocks)
vi.mock('src/server/user-auth/repository', () => repositoryMocks)

import {POST} from '../exchange'
import {invokeApiRoute} from '../../__tests__/invoke'

const createRequest = (): Request =>
  new Request('https://www.pomofi.io/api/app-auth/exchange', {
    body: JSON.stringify({
      authorizationCode: 'sandbox-authorization',
      referrer: 'SANDBOX',
    }),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })

describe('Toss login exchange route', () => {
  beforeEach(() => {
    tossAuthMocks.exchangeTossAuthorization.mockReset().mockResolvedValue({userKey: 'toss-user'})
    repositoryMocks.createTossAppSession.mockReset().mockResolvedValue({
      expiresAt: new Date('2026-09-21T00:00:00.000Z'),
      token: 'pomo-session',
      userId: 'pomo-user-id',
    })
  })

  it('should create a Pomo user session from a Sandbox identity', async () => {
    const response = await invokeApiRoute(POST, createRequest())

    expect(response.status).toBe(200)
    expect(tossAuthMocks.exchangeTossAuthorization).toHaveBeenCalledWith({
      authorizationCode: 'sandbox-authorization',
      referrer: 'SANDBOX',
    })
    expect(repositoryMocks.createTossAppSession).toHaveBeenCalledWith('toss-user')
    await expect(response.json()).resolves.toEqual({
      expiresAt: '2026-09-21T00:00:00.000Z',
      token: 'pomo-session',
      userId: 'pomo-user-id',
    })
  })
})
