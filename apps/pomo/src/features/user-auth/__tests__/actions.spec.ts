/** @vitest-environment jsdom */

import {beforeEach, describe, expect, it, vi} from 'vitest'

const sessionMocks = vi.hoisted(() => ({
  createTossLoginSession: vi.fn(),
  requestAccountLinkEmail: vi.fn(),
  revokeTossLoginSession: vi.fn(),
}))
const webMocks = vi.hoisted(() => ({completeAccountLink: vi.fn()}))

vi.mock('@solidjs/router', () => ({action: vi.fn((clientAction) => clientAction)}))
vi.mock('../app-session', () => sessionMocks)
vi.mock('../web-session', () => webMocks)

import {
  completeAccountLinkAction,
  createTossLoginSessionAction,
  requestAccountLinkEmailAction,
  revokeTossLoginSessionAction,
} from '../actions'

beforeEach(() => {
  vi.resetAllMocks()
  sessionMocks.createTossLoginSession.mockResolvedValue('app-token')
  sessionMocks.requestAccountLinkEmail.mockResolvedValue({status: 'sent'})
  sessionMocks.revokeTossLoginSession.mockResolvedValue({storageStatus: 'cleared'})
  webMocks.completeAccountLink.mockResolvedValue('linked')
})

describe('session command actions', () => {
  it('should return authentication and cleanup states from the existing workflows', async () => {
    await expect(createTossLoginSessionAction()).resolves.toEqual({
      status: 'authenticated',
      token: 'app-token',
    })
    await expect(revokeTossLoginSessionAction('app-token')).resolves.toEqual({
      status: 'signed-out',
    })
    await expect(completeAccountLinkAction('challenge')).resolves.toEqual({status: 'linked'})

    expect(sessionMocks.revokeTossLoginSession).toHaveBeenCalledWith('app-token')
    expect(webMocks.completeAccountLink).toHaveBeenCalledWith('challenge')
  })

  it('should distinguish cleanup-pending and unavailable completion', async () => {
    sessionMocks.revokeTossLoginSession.mockResolvedValueOnce({storageStatus: 'cleanup-pending'})
    webMocks.completeAccountLink.mockRejectedValueOnce(new Error('offline'))

    await expect(revokeTossLoginSessionAction('app-token')).resolves.toEqual({
      status: 'cleanup-pending',
    })
    await expect(completeAccountLinkAction('challenge')).resolves.toEqual({
      status: 'unavailable',
    })
  })

  it('should normalize login and logout workflow failures', async () => {
    sessionMocks.createTossLoginSession.mockRejectedValueOnce(new Error('login unavailable'))
    sessionMocks.revokeTossLoginSession.mockRejectedValueOnce(new Error('logout unavailable'))

    await expect(createTossLoginSessionAction()).resolves.toEqual({status: 'unavailable'})
    await expect(revokeTossLoginSessionAction('app-token')).resolves.toEqual({
      status: 'unavailable',
    })
  })
})

describe('account-link email action', () => {
  it('should trim FormData and preserve rate-limit detail', async () => {
    sessionMocks.requestAccountLinkEmail.mockResolvedValueOnce({
      retryAfterSeconds: 42,
      status: 'rate-limited',
    })

    await expect(
      requestAccountLinkEmailAction(
        'app-token',
        new URLSearchParams({email: ' user@example.com '}),
      ),
    ).resolves.toEqual({retryAfterSeconds: 42, status: 'rate-limited'})
    expect(sessionMocks.requestAccountLinkEmail).toHaveBeenCalledWith(
      'app-token',
      'user@example.com',
    )
  })

  it('should reject an empty email without calling the adapter', async () => {
    await expect(
      requestAccountLinkEmailAction('app-token', new URLSearchParams()),
    ).resolves.toEqual({status: 'not-sent'})
    expect(sessionMocks.requestAccountLinkEmail).not.toHaveBeenCalled()
  })

  it('should preserve sent and rejected results and normalize transport failure', async () => {
    sessionMocks.requestAccountLinkEmail
      .mockResolvedValueOnce({status: 'sent'})
      .mockResolvedValueOnce({status: 'not-sent'})
      .mockRejectedValueOnce(new Error('offline'))
    const values = new URLSearchParams({email: 'user@example.com'})

    await expect(requestAccountLinkEmailAction('app-token', values)).resolves.toEqual({
      status: 'sent',
    })
    await expect(requestAccountLinkEmailAction('app-token', values)).resolves.toEqual({
      status: 'not-sent',
    })
    await expect(requestAccountLinkEmailAction('app-token', values)).resolves.toEqual({
      status: 'unavailable',
    })
  })
})
