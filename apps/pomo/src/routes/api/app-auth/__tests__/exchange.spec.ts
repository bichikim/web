import {beforeEach, describe, expect, it, vi} from 'vitest'

const tossAuthMocks = vi.hoisted(() => ({exchangeTossAuthorization: vi.fn()}))
const repositoryMocks = vi.hoisted(() => ({
  createPendingTossAppSession: vi.fn(),
}))

vi.mock('src/server/toss-auth/client', () => tossAuthMocks)
vi.mock('src/server/user-auth/repository', () => repositoryMocks)

import {POST, PUT} from '../exchange'
import {invokeApiRoute} from '../../__tests__/invoke'

const createRequest = (method: 'POST' | 'PUT' = 'PUT'): Request =>
  new Request('https://www.pomofi.io/api/app-auth/exchange', {
    body: JSON.stringify({
      authorizationCode: 'sandbox-authorization',
      referrer: 'SANDBOX',
    }),
    headers: {'Content-Type': 'application/json'},
    method,
  })

describe('Toss login exchange route', () => {
  beforeEach(() => {
    tossAuthMocks.exchangeTossAuthorization.mockReset().mockResolvedValue({userKey: 'toss-user'})
    repositoryMocks.createPendingTossAppSession.mockReset().mockResolvedValue({
      expiresAt: new Date('2026-09-21T00:00:00.000Z'),
      token: 'pomo-session',
      userId: 'pomo-user-id',
    })
  })

  it('should create a pending Pomo session for a storage-confirmed exchange', async () => {
    const response = await invokeApiRoute(PUT, createRequest())

    expect(response.status).toBe(200)
    expect(tossAuthMocks.exchangeTossAuthorization).toHaveBeenCalledWith({
      authorizationCode: 'sandbox-authorization',
      referrer: 'SANDBOX',
    })
    expect(repositoryMocks.createPendingTossAppSession).toHaveBeenCalledWith('toss-user')
    await expect(response.json()).resolves.toEqual({
      expiresAt: '2026-09-21T00:00:00.000Z',
      token: 'pomo-session',
      userId: 'pomo-user-id',
    })
  })

  it('should create a pending session for legacy clients', async () => {
    const response = await invokeApiRoute(POST, createRequest('POST'))

    expect(response.status).toBe(200)
    expect(repositoryMocks.createPendingTossAppSession).toHaveBeenCalledWith('toss-user')
  })

  it('should reject invalid and oversized exchange requests', async () => {
    const createRequestWithBody = (body: string) =>
      new Request('https://www.pomofi.io/api/app-auth/exchange', {
        body,
        headers: {'Content-Type': 'application/json'},
        method: 'PUT',
      })
    const invalidResponse = await invokeApiRoute(
      PUT,
      createRequestWithBody(JSON.stringify({authorizationCode: '', referrer: 'SANDBOX'})),
    )
    const oversizedResponse = await invokeApiRoute(PUT, createRequestWithBody('x'.repeat(8193)))

    expect(invalidResponse.status).toBe(400)
    expect(oversizedResponse.status).toBe(413)
    expect(tossAuthMocks.exchangeTossAuthorization).not.toHaveBeenCalled()
  })

  it('should return a stable gateway error when the Toss exchange fails', async () => {
    const error = new Error('Toss unavailable')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    tossAuthMocks.exchangeTossAuthorization.mockRejectedValue(error)

    const response = await invokeApiRoute(PUT, createRequest())

    expect(response.status).toBe(502)
    await expect(response.json()).resolves.toEqual({error: 'login_failed'})
    expect(consoleError).toHaveBeenCalledWith('Toss login exchange failed', error)
  })
})
