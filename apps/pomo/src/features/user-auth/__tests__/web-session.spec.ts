import {afterEach, expect, it, vi} from 'vitest'

import {completeAccountLink, readAccountSession, signOutWebSession} from '../web-session'

afterEach(() => {
  vi.unstubAllGlobals()
})

it('should report a successful web session revocation', () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, {status: 200})))

  return expect(signOutWebSession()).resolves.toBe(true)
})

it('should keep the web session visible when revocation fails', () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, {status: 503})))

  return expect(signOutWebSession()).resolves.toBe(false)
})

it('should distinguish an anonymous session from an auth service outage', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response(null, {status: 401}))
    .mockResolvedValueOnce(new Response(null, {status: 503}))
    .mockResolvedValueOnce(new Response(null, {status: 503}))
  vi.stubGlobal('fetch', fetchMock)

  await expect(readAccountSession()).resolves.toBeNull()
  await expect(readAccountSession()).rejects.toThrow('Web account session is unavailable')
})

it('should return a validated account session and preserve an invalid session body as absence', async () => {
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({email: 'user@example.com'}))
    .mockResolvedValueOnce(Response.json({email: 1}))
  vi.stubGlobal('fetch', fetchMock)

  await expect(readAccountSession()).resolves.toEqual({email: 'user@example.com'})
  await expect(readAccountSession()).resolves.toBeNull()
})

it('should preserve transport failures while reading the account session', async () => {
  const error = new TypeError('network unavailable')
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error))

  await expect(readAccountSession()).rejects.toBe(error)
})

it('should serialize an account-link completion and preserve a successful status', async () => {
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json({linked: true, userId: 'user'}))
  vi.stubGlobal('fetch', fetchMock)

  await expect(completeAccountLink('challenge')).resolves.toBe('linked')
  expect(fetchMock).toHaveBeenCalledWith(
    '/api/account/complete-link',
    expect.objectContaining({
      body: JSON.stringify({token: 'challenge'}),
      credentials: 'include',
      method: 'POST',
    }),
  )
})

it('should preserve a link token when completion is unavailable', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, {status: 503})))

  await expect(completeAccountLink('challenge')).rejects.toThrow(
    'Account link completion is unavailable',
  )
})

it('should classify a consumed account link as invalid', () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, {status: 410})))

  return expect(completeAccountLink('challenge')).resolves.toBe('invalid')
})

it('should send the JSON payload required by the auth sign-out endpoint', async () => {
  const fetchMock = vi.fn<typeof fetch>().mockImplementation(async (_input, init) => {
    const contentType = new Headers(init?.headers).get('Content-Type')
    return new Response(null, {
      status: contentType === 'application/json' && init?.body === '{}' ? 200 : 415,
    })
  })
  vi.stubGlobal('fetch', fetchMock)

  await expect(signOutWebSession()).resolves.toBe(true)
  expect(fetchMock).toHaveBeenCalledWith(
    '/api/auth/sign-out',
    expect.objectContaining({credentials: 'include', method: 'POST'}),
  )
})
