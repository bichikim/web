import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

const repositoryMocks = vi.hoisted(() => ({
  createAccountLinkChallenge: vi.fn(),
  invalidateAccountLinkChallenge: vi.fn(),
}))
const authMocks = vi.hoisted(() => ({authenticateAppRequest: vi.fn()}))
const emailMocks = vi.hoisted(() => ({sendAccountLinkEmail: vi.fn()}))

vi.mock('src/server/user-auth/http', async () => {
  const actual = await vi.importActual<typeof import('src/server/user-auth/http')>(
    'src/server/user-auth/http',
  )

  return {...actual, authenticateAppRequest: authMocks.authenticateAppRequest}
})
vi.mock('src/server/user-auth/magic-link', () => emailMocks)
vi.mock('src/server/user-auth/repository', () => repositoryMocks)

import {POST} from '../link-email'
import {invokeApiRoute} from '../../__tests__/invoke'

const createRequest = (): Request =>
  new Request('https://www.pomofi.io/api/account/link-email', {
    body: JSON.stringify({email: 'User@Example.com'}),
    headers: {'Content-Type': 'application/json'},
    method: 'POST',
  })

describe('account link email route', () => {
  beforeEach(() => {
    authMocks.authenticateAppRequest.mockReset().mockResolvedValue({
      token: 'app-token',
      userId: 'user-id',
    })
    emailMocks.sendAccountLinkEmail.mockReset().mockResolvedValue(true)
    repositoryMocks.createAccountLinkChallenge.mockReset().mockResolvedValue({
      expiresAt: new Date('2026-08-22T00:30:00.000Z'),
      status: 'created',
      token: 'challenge-token',
    })
    repositoryMocks.invalidateAccountLinkChallenge.mockReset().mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should reject repeated link requests before sending another email', async () => {
    repositoryMocks.createAccountLinkChallenge.mockResolvedValue({
      retryAfterSeconds: 42,
      status: 'rate-limited',
    })

    const response = await invokeApiRoute(POST, createRequest())

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('42')
    expect(emailMocks.sendAccountLinkEmail).not.toHaveBeenCalled()
  })

  it('should bind a new challenge to the requested email', async () => {
    const response = await invokeApiRoute(POST, createRequest())

    expect(response.status).toBe(200)
    expect(repositoryMocks.createAccountLinkChallenge).toHaveBeenCalledWith(
      'user-id',
      'User@Example.com',
    )
    expect(emailMocks.sendAccountLinkEmail).toHaveBeenCalledWith(
      expect.objectContaining({challengeToken: 'challenge-token', email: 'User@Example.com'}),
    )
    expect(repositoryMocks.invalidateAccountLinkChallenge).not.toHaveBeenCalled()
  })

  it('should invalidate the challenge when email delivery is rejected', async () => {
    emailMocks.sendAccountLinkEmail.mockResolvedValue(false)

    const response = await invokeApiRoute(POST, createRequest())

    expect(response.status).toBe(502)
    expect(repositoryMocks.invalidateAccountLinkChallenge).toHaveBeenCalledWith('challenge-token')
  })

  it('should preserve the challenge when email delivery is uncertain', async () => {
    const error = new Error('Email provider unavailable')
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    emailMocks.sendAccountLinkEmail.mockRejectedValue(error)

    const response = await invokeApiRoute(POST, createRequest())

    expect(response.status).toBe(502)
    expect(errorSpy).toHaveBeenCalledWith('Failed to send an account link email', error)
    expect(repositoryMocks.invalidateAccountLinkChallenge).not.toHaveBeenCalled()
  })
})
