import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

const repositoryMocks = vi.hoisted(() => ({revokeTossAppSessions: vi.fn()}))

vi.mock('src/server/user-auth/repository', () => repositoryMocks)

import {GET, POST} from '../unlink'
import {invokeApiRoute} from '../../__tests__/invoke'

const CALLBACK_AUTHORIZATION = 'Basic dXNlcjpwYXNz'

const createPostRequest = (authorization = CALLBACK_AUTHORIZATION): Request =>
  new Request('https://www.pomofi.io/api/app-auth/unlink', {
    body: JSON.stringify({referrer: 'UNLINK', userKey: 12345}),
    headers: {Authorization: authorization, 'Content-Type': 'application/json'},
    method: 'POST',
  })

describe('Toss unlink callback route', () => {
  beforeEach(() => {
    vi.stubEnv('POMO_TOSS_CALLBACK_AUTHORIZATION', CALLBACK_AUTHORIZATION)
    repositoryMocks.revokeTossAppSessions.mockReset().mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('should reject a callback with the wrong authorization', async () => {
    const response = await invokeApiRoute(POST, createPostRequest('Basic wrong'))

    expect(response.status).toBe(401)
    expect(repositoryMocks.revokeTossAppSessions).not.toHaveBeenCalled()
  })

  it('should revoke active sessions for a POST callback', async () => {
    const response = await invokeApiRoute(POST, createPostRequest())

    expect(response.status).toBe(204)
    expect(repositoryMocks.revokeTossAppSessions).toHaveBeenCalledWith('12345')
  })

  it('should revoke active sessions for a GET callback', async () => {
    const request = new Request(
      'https://www.pomofi.io/api/app-auth/unlink?userKey=user-key&referrer=WITHDRAWAL_TOSS',
      {headers: {Authorization: CALLBACK_AUTHORIZATION}},
    )
    const response = await invokeApiRoute(GET, request)

    expect(response.status).toBe(204)
    expect(repositoryMocks.revokeTossAppSessions).toHaveBeenCalledWith('user-key')
  })
})
