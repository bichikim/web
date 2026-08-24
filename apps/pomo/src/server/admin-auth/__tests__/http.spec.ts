import {beforeEach, describe, expect, it, vi} from 'vitest'

const sessionMocks = vi.hoisted(() => ({getAdminSession: vi.fn()}))

vi.mock('../session', () => sessionMocks)

import {authorizeAdminRequest} from '../http'

describe('admin API authorization', () => {
  beforeEach(() => {
    sessionMocks.getAdminSession.mockReset()
  })

  it('should authorize only an admin session', async () => {
    sessionMocks.getAdminSession.mockResolvedValue({access: 'admin', cookies: ['session=updated']})

    await expect(
      authorizeAdminRequest(new Request('https://pomo.example/api/admin/music')),
    ).resolves.toEqual({authorized: true, cookies: ['session=updated']})
  })

  it.each([
    ['anonymous', 401, 'unauthorized'],
    ['forbidden', 403, 'forbidden'],
    ['invalid', 503, 'authentication_unavailable'],
  ] as const)('should map %s access to an API rejection', async (access, status, error) => {
    sessionMocks.getAdminSession.mockResolvedValue({access, cookies: []})

    const result = await authorizeAdminRequest(new Request('https://pomo.example/api/admin/music'))

    expect(result.authorized).toBe(false)

    if (result.authorized) {
      throw new TypeError('Expected an admin API rejection')
    }

    expect(result.response.status).toBe(status)
    await expect(result.response.json()).resolves.toEqual({error})
  })
})
