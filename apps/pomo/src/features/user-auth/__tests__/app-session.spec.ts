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
  clearStoredAppSession,
  createTossLoginSession,
  readStoredAppSession,
  requestAccountLinkEmail,
  revokeTossLoginSession,
  storeAppSession,
  validateAppSession,
} from '../app-session'

describe('app session lifecycle', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_POMO_PUBLIC_ORIGIN', 'https://www.pomofi.io')
    storageMocks.getItem.mockReset()
    storageMocks.getItem.mockResolvedValue(null)
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

  it('should read, write, and clear the native session token', async () => {
    storageMocks.getItem.mockResolvedValue('stored-token')

    await expect(readStoredAppSession()).resolves.toBe('stored-token')
    await expect(storeAppSession('next-token')).resolves.toBeUndefined()
    await expect(clearStoredAppSession()).resolves.toBeUndefined()
    expect(storageMocks.getItem).toHaveBeenCalledWith('pomo:app-session:v1')
    expect(storageMocks.setItem).toHaveBeenCalledWith('pomo:app-session:v1', 'next-token')
    expect(storageMocks.removeItem).toHaveBeenCalledWith('pomo:app-session:v1')
  })

  it('should accept a valid server session', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null)))

    await expect(validateAppSession('token')).resolves.toBe(true)
  })

  it('should preserve the stored session when validation is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, {status: 503})))

    await expect(validateAppSession('token')).rejects.toThrow('App session validation failed')
    expect(storageMocks.removeItem).not.toHaveBeenCalled()
  })

  it('should clear an already invalid server session during logout', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, {status: 401})))

    await expect(revokeTossLoginSession('token')).resolves.toEqual({storageStatus: 'cleared'})
    expect(storageMocks.removeItem).toHaveBeenCalledWith('pomo:app-session:v1')
  })

  it('should revoke a valid server session before clearing storage', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null)))

    await expect(revokeTossLoginSession('token')).resolves.toEqual({storageStatus: 'cleared'})
    expect(storageMocks.removeItem).toHaveBeenCalledWith('pomo:app-session:v1')
  })

  it('should report pending storage cleanup after revoking the server session', async () => {
    const storageError = new Error('native storage unavailable')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null))
    storageMocks.removeItem.mockRejectedValueOnce(storageError)
    vi.stubGlobal('fetch', fetchMock)

    await expect(revokeTossLoginSession('token')).resolves.toEqual({
      storageStatus: 'cleanup-pending',
    })
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(storageMocks.removeItem).toHaveBeenCalledWith('pomo:app-session:v1')
    expect(consoleError).toHaveBeenCalledExactlyOnceWith(
      'Failed to clear revoked Toss session from storage',
      storageError,
    )
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
      .mockResolvedValueOnce(Response.json({token: 'session-token'}))
      .mockResolvedValueOnce(new Response(null))
    vi.stubGlobal('fetch', fetchMock)

    await expect(createTossLoginSession()).resolves.toBe('session-token')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/app-auth/exchange',
      expect.objectContaining({
        body: JSON.stringify(authorization),
        method: 'PUT',
      }),
    )
    const init = fetchMock.mock.calls[0]?.[1]
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json')
    expect(storageMocks.setItem).toHaveBeenCalledWith('pomo:app-session:v1', 'session-token')
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/app-auth/session',
      expect.objectContaining({method: 'PATCH'}),
    )
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(storageMocks.setItem.mock.invocationCallOrder[0]).toBeLessThan(
      fetchMock.mock.invocationCallOrder[1] ?? 0,
    )
  })

  it('should resume a stored session before starting another Toss exchange', async () => {
    storageMocks.getItem.mockResolvedValue('stored-pending-token')
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null))
    vi.stubGlobal('fetch', fetchMock)

    await expect(createTossLoginSession()).resolves.toBe('stored-pending-token')

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/app-auth/session',
      expect.objectContaining({method: 'PATCH'}),
    )
    expect(tossAuthMocks.login).not.toHaveBeenCalled()
    expect(storageMocks.setItem).not.toHaveBeenCalled()
  })

  it('should replace a definitively invalid stored session through a new Toss exchange', async () => {
    storageMocks.getItem.mockResolvedValue('expired-pending-token')
    tossAuthMocks.login.mockResolvedValue({authorizationCode: 'authorization', referrer: 'DEFAULT'})
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, {status: 401}))
      .mockResolvedValueOnce(Response.json({token: 'session-token'}))
      .mockResolvedValueOnce(new Response(null))
    vi.stubGlobal('fetch', fetchMock)

    await expect(createTossLoginSession()).resolves.toBe('session-token')

    expect(storageMocks.removeItem).toHaveBeenCalledWith('pomo:app-session:v1')
    expect(tossAuthMocks.login).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('should leave a created server session pending when native storage fails', async () => {
    const storageError = new Error('native storage unavailable')
    tossAuthMocks.login.mockResolvedValue({authorizationCode: 'authorization', referrer: 'DEFAULT'})
    storageMocks.setItem.mockRejectedValue(storageError)
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({token: 'session-token'}))
    vi.stubGlobal('fetch', fetchMock)

    await expect(createTossLoginSession()).rejects.toBe(storageError)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('should report a session activation failure after storing the pending token', async () => {
    tossAuthMocks.login.mockResolvedValue({authorizationCode: 'authorization', referrer: 'DEFAULT'})
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json({token: 'session-token'}))
      .mockResolvedValueOnce(new Response(null, {status: 503}))
    vi.stubGlobal('fetch', fetchMock)

    await expect(createTossLoginSession()).rejects.toThrow('App session activation failed')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(storageMocks.setItem).toHaveBeenCalledWith('pomo:app-session:v1', 'session-token')
  })

  it('should stop before storage when the pending exchange method is unsupported', async () => {
    tossAuthMocks.login.mockResolvedValue({authorizationCode: 'authorization', referrer: 'DEFAULT'})
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(Response.json({error: 'failed'}, {status: 405})),
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

  it('should rethrow unexpected Toss exchange failures', async () => {
    const error = new Error('network failed')
    tossAuthMocks.login.mockResolvedValue({authorizationCode: 'authorization', referrer: 'DEFAULT'})
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(error))

    await expect(createTossLoginSession()).rejects.toBe(error)
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

  it.each(['invalid', '1.5', '0'])(
    'should reject the invalid retry delay %s',
    async (retryAfter) => {
      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValue(
            new Response(null, {headers: {'Retry-After': retryAfter}, status: 429}),
          ),
      )

      await expect(requestAccountLinkEmail('token', 'user@example.com')).resolves.toEqual({
        retryAfterSeconds: null,
        status: 'rate-limited',
      })
    },
  )
})
