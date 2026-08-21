import {describe, expect, it, vi} from 'vitest'

import {exchangeTossAuthorization} from '../client'

describe('exchangeTossAuthorization', () => {
  it('should exchange an authorization code and return the app-scoped user key', async () => {
    const requester = vi
      .fn()
      .mockResolvedValueOnce({
        body: {resultType: 'SUCCESS', success: {accessToken: 'toss-access'}},
        status: 200,
      })
      .mockResolvedValueOnce({
        body: {resultType: 'SUCCESS', success: {userKey: 443_731_104}},
        status: 200,
      })

    await expect(
      exchangeTossAuthorization(
        {authorizationCode: 'one-time-code', referrer: 'SANDBOX'},
        requester,
      ),
    ).resolves.toEqual({userKey: '443731104'})
    expect(requester).toHaveBeenNthCalledWith(1, {
      body: {authorizationCode: 'one-time-code', referrer: 'SANDBOX'},
      method: 'POST',
      path: '/api-partner/v1/apps-in-toss/user/oauth2/generate-token',
    })
    expect(requester).toHaveBeenNthCalledWith(2, {
      accessToken: 'toss-access',
      method: 'GET',
      path: '/api-partner/v1/apps-in-toss/user/oauth2/login-me',
    })
  })

  it('should reject unsuccessful Toss responses before reading user information', async () => {
    const requester = vi.fn().mockResolvedValue({body: {resultType: 'FAIL'}, status: 401})

    await expect(
      exchangeTossAuthorization(
        {authorizationCode: 'expired-code', referrer: 'DEFAULT'},
        requester,
      ),
    ).rejects.toThrow('status 401')
    expect(requester).toHaveBeenCalledTimes(1)
  })

  it('should reject malformed successful responses', async () => {
    const requester = vi.fn().mockResolvedValue({body: {resultType: 'SUCCESS'}, status: 200})

    await expect(
      exchangeTossAuthorization(
        {authorizationCode: 'one-time-code', referrer: 'DEFAULT'},
        requester,
      ),
    ).rejects.toBeDefined()
  })
})
