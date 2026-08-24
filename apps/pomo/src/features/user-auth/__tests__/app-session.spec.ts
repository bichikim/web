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

import {createTossLoginSession, revokeTossLoginSession, validateAppSession} from '../app-session'

describe('app session lifecycle', () => {
  beforeEach(() => {
    vi.stubEnv('POMO_PUBLIC_ORIGIN', 'https://www.pomofi.io')
    storageMocks.removeItem.mockReset().mockResolvedValue(undefined)
    storageMocks.setItem.mockReset().mockResolvedValue(undefined)
    tossAuthMocks.login.mockReset()
  })

  it('should exchange a Sandbox authorization and store the Pomo session', async () => {
    tossAuthMocks.login.mockResolvedValue({
      authorizationCode: 'sandbox-authorization',
      referrer: 'SANDBOX',
    })
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        expiresAt: '2026-09-21T00:00:00.000Z',
        token: 'pomo-session',
        userId: 'pomo-user-id',
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    await expect(createTossLoginSession()).resolves.toBe('pomo-session')
    expect(fetchMock).toHaveBeenCalledWith(new URL('https://www.pomofi.io/api/app-auth/exchange'), {
      body: JSON.stringify({
        authorizationCode: 'sandbox-authorization',
        referrer: 'SANDBOX',
      }),
      headers: {'Content-Type': 'application/json'},
      method: 'POST',
    })
    expect(storageMocks.setItem).toHaveBeenCalledWith('pomo:app-session:v1', 'pomo-session')
  })

  afterEach(() => {
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
})
