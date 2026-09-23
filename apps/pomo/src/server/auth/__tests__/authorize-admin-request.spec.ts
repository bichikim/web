/** @vitest-environment node */
import {beforeEach, describe, expect, it, vi} from 'vitest'

const sessionMocks = vi.hoisted(() => ({getAuthSession: vi.fn()}))

vi.mock('../get-auth-session', () => sessionMocks)

import {authorizeAdminRequest} from '../authorize-admin-request'

describe('admin API authorization', () => {
  beforeEach(() => {
    sessionMocks.getAuthSession.mockReset()
  })

  it('should authorize only an admin session', async () => {
    sessionMocks.getAuthSession.mockResolvedValue({
      access: 'admin',
      setCookies: ['session=updated'],
    })
    const request = new Request('https://pomo.example/api/admin/music', {
      headers: {Authorization: 'Bearer app-token'},
    })

    await expect(authorizeAdminRequest(request)).resolves.toEqual({
      authorized: true,
      cookies: ['session=updated'],
    })
    expect(sessionMocks.getAuthSession).toHaveBeenCalledWith(request, {provider: 'neon'})
  })

  it.each([
    ['anonymous', 401, 'unauthorized'],
    ['user', 403, 'forbidden'],
    ['invalid', 503, 'authentication_unavailable'],
  ] as const)('should map %s access to an API rejection', async (access, status, error) => {
    sessionMocks.getAuthSession.mockResolvedValue({access, setCookies: []})

    const result = await authorizeAdminRequest(new Request('https://pomo.example/api/admin/music'))

    expect(result.authorized).toBe(false)

    if (result.authorized) {
      throw new TypeError('Expected an admin API rejection')
    }

    expect(result.response.status).toBe(status)
    await expect(result.response.json()).resolves.toEqual({error})
  })

  it('should preserve an unexpected access value at the exhaustive fallback', async () => {
    sessionMocks.getAuthSession.mockResolvedValue({access: 'unexpected', setCookies: []})

    await expect(
      authorizeAdminRequest(new Request('https://pomo.example/api/admin/music')),
    ).resolves.toBe('unexpected')
  })

  it('should return service unavailable when authentication throws', async () => {
    const error = new Error('provider unavailable')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    sessionMocks.getAuthSession.mockRejectedValue(error)

    const result = await authorizeAdminRequest(new Request('https://pomo.example/api/admin/music'))
    expect(consoleError).toHaveBeenCalledWith('Pomo admin API authentication is unavailable', error)
    expect(result.authorized).toBe(false)
    if (!result.authorized) {
      expect(result.response.status).toBe(503)
      await expect(result.response.json()).resolves.toEqual({error: 'authentication_unavailable'})
    }
  })
})
