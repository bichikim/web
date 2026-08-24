import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

const storageMocks = vi.hoisted(() => ({
  getItem: vi.fn(),
  removeItem: vi.fn(),
  setItem: vi.fn(),
}))
const tossAuthMocks = vi.hoisted(() => ({login: vi.fn()}))

vi.mock('@apps-in-toss/web-framework', () => ({
  Storage: storageMocks,
  TossAuth: tossAuthMocks,
}))

import {
  createTossLoginSession,
  requestAccountLinkEmail,
  revokeTossLoginSession,
  validateAppSession,
} from '../app-session'

describe('app session lifecycle', () => {
  beforeEach(() => {
    vi.stubEnv('POMO_PUBLIC_ORIGIN', 'https://www.pomofi.io')
    storageMocks.removeItem.mockReset().mockResolvedValue(undefined)
    storageMocks.setItem.mockReset().mockResolvedValue(undefined)
    tossAuthMocks.login.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('should classify only unauthorized responses as invalid sessions', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, {status: 401})))

    await expect(validateAppSession('token')).resolves.toBe(false)
  })

  it('should preserve the stored session when validation is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, {status: 503})))

    await expect(validateAppSession('token')).rejects.toThrow('App session validation failed')
    expect(storageMocks.removeItem).not.toHaveBeenCalled()
  })

  it('should clear an already invalid server session during logout', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, {status: 401})))

    await expect(revokeTossLoginSession('token')).resolves.toBeUndefined()
    expect(storageMocks.removeItem).toHaveBeenCalledWith('pomo:app-session:v1')
  })

  it('should preserve the stored session when revocation is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, {status: 503})))

    await expect(revokeTossLoginSession('token')).rejects.toThrow('App session revocation failed')
    expect(storageMocks.removeItem).not.toHaveBeenCalled()
  })

  it('should exchange a Toss authorization object for a validated stored session', async () => {
    const authorization = {authorizationCode: 'authorization', referrer: 'DEFAULT'} as const
    tossAuthMocks.login.mockResolvedValue(authorization)
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({token: 'session-token'}))
    vi.stubGlobal('fetch', fetchMock)

    await expect(createTossLoginSession()).resolves.toBe('session-token')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/app-auth/exchange',
      expect.objectContaining({body: JSON.stringify(authorization), method: 'POST'}),
    )
    const init = fetchMock.mock.calls[0]?.[1]
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json')
    expect(storageMocks.setItem).toHaveBeenCalledWith('pomo:app-session:v1', 'session-token')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('should revoke a created server session when native storage fails', async () => {
    const storageError = new Error('native storage unavailable')
    tossAuthMocks.login.mockResolvedValue({authorizationCode: 'authorization', referrer: 'DEFAULT'})
    storageMocks.setItem.mockRejectedValue(storageError)
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({token: 'session-token'}))
      .mockResolvedValueOnce(new Response(null))
    vi.stubGlobal('fetch', fetchMock)

    await expect(createTossLoginSession()).rejects.toBe(storageError)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/app-auth/session',
      expect.objectContaining({
        headers: expect.any(Headers),
        method: 'DELETE',
      }),
    )
    const revokeHeaders = new Headers(fetchMock.mock.calls[1]?.[1]?.headers)
    expect(revokeHeaders.get('Authorization')).toBe('Bearer session-token')
  })

  it('should preserve the storage error when compensating revocation fails', async () => {
    const storageError = new Error('native storage unavailable')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    tossAuthMocks.login.mockResolvedValue({authorizationCode: 'authorization', referrer: 'DEFAULT'})
    storageMocks.setItem.mockRejectedValue(storageError)
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({token: 'session-token'}))
      .mockResolvedValueOnce(new Response(null, {status: 503}))
    vi.stubGlobal('fetch', fetchMock)

    await expect(createTossLoginSession()).rejects.toBe(storageError)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(consoleError).toHaveBeenCalledExactlyOnceWith(
      'Failed to revoke Toss session after storage failure',
      expect.any(Error),
    )
  })

  it('should report the storage error without waiting for compensating revocation', async () => {
    vi.useFakeTimers()
    const storageError = new Error('native storage unavailable')
    tossAuthMocks.login.mockResolvedValue({authorizationCode: 'authorization', referrer: 'DEFAULT'})
    storageMocks.setItem.mockRejectedValue(storageError)
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({token: 'session-token'}))
      .mockImplementationOnce(
        () =>
          new Promise<Response>(() => {
            // The compensation request deliberately remains pending.
          }),
      )
    vi.stubGlobal('fetch', fetchMock)
    const timeoutResult = 'compensation-pending'
    const resultPromise = Promise.race([
      createTossLoginSession().catch((error: unknown) => error),
      new Promise<string>((resolve) => {
        setTimeout(resolve, 1, timeoutResult)
      }),
    ])

    await vi.advanceTimersByTimeAsync(1)
    const result = await resultPromise

    expect(result).toBe(storageError)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('should preserve the Toss exchange HTTP error contract', async () => {
    tossAuthMocks.login.mockResolvedValue({authorizationCode: 'authorization', referrer: 'DEFAULT'})
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(Response.json({error: 'failed'}, {status: 502})),
    )

    await expect(createTossLoginSession()).rejects.toThrow('Toss login exchange failed')
    expect(storageMocks.setItem).not.toHaveBeenCalled()
  })

  it('should preserve the invalid Toss session response contract', async () => {
    tossAuthMocks.login.mockResolvedValue({authorizationCode: 'authorization', referrer: 'DEFAULT'})
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(Response.json({token: 1})))

    await expect(createTossLoginSession()).rejects.toThrow('Toss login returned an invalid session')
    expect(storageMocks.setItem).not.toHaveBeenCalled()
  })

  it('should serialize an account-link email while preserving the status result', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({error: 'invalid_email'}, {status: 400}))
    vi.stubGlobal('fetch', fetchMock)

    await expect(requestAccountLinkEmail('token', 'user@example.com')).resolves.toEqual({
      status: 'not-sent',
    })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/account/link-email',
      expect.objectContaining({
        body: JSON.stringify({email: 'user@example.com'}),
        method: 'POST',
      }),
    )
  })

  it('should report a successful account link email request', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null)))

    await expect(requestAccountLinkEmail('token', 'user@example.com')).resolves.toEqual({
      status: 'sent',
    })
  })

  it('should preserve the account link retry delay', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, {headers: {'Retry-After': '42'}, status: 429})),
    )

    await expect(requestAccountLinkEmail('token', 'user@example.com')).resolves.toEqual({
      retryAfterSeconds: 42,
      status: 'rate-limited',
    })
  })

  it('should tolerate a missing account link retry delay', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, {status: 429})))

    await expect(requestAccountLinkEmail('token', 'user@example.com')).resolves.toEqual({
      retryAfterSeconds: null,
      status: 'rate-limited',
    })
  })
})
