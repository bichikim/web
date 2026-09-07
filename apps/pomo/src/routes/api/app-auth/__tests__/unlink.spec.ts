import {beforeEach, describe, expect, it, vi} from 'vitest'

const repositoryMocks = vi.hoisted(() => ({revokeTossAppSessions: vi.fn()}))
const environmentMocks = vi.hoisted(() => {
  const env: {POMO_TOSS_CALLBACK_AUTHORIZATION: string | undefined} = {
    POMO_TOSS_CALLBACK_AUTHORIZATION: 'Basic dXNlcjpwYXNz',
  }

  return {env}
})

vi.mock('src/server/user-auth/repository', () => repositoryMocks)
vi.mock('src/env', () => ({
  env: environmentMocks.env,
}))

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
    environmentMocks.env.POMO_TOSS_CALLBACK_AUTHORIZATION = CALLBACK_AUTHORIZATION
    repositoryMocks.revokeTossAppSessions.mockReset().mockResolvedValue(undefined)
  })

  it('should reject a callback with the wrong authorization', async () => {
    const response = await invokeApiRoute(POST, createPostRequest('Basic wrong'))

    expect(response.status).toBe(401)
    expect(repositoryMocks.revokeTossAppSessions).not.toHaveBeenCalled()
  })

  it('should reject a callback when authorization is not configured', async () => {
    environmentMocks.env.POMO_TOSS_CALLBACK_AUTHORIZATION = undefined

    const response = await invokeApiRoute(POST, createPostRequest())

    expect(response.status).toBe(401)
    expect(repositoryMocks.revokeTossAppSessions).not.toHaveBeenCalled()
  })

  it('should reject a callback without authorization', async () => {
    const request = new Request('https://www.pomofi.io/api/app-auth/unlink', {
      body: JSON.stringify({referrer: 'UNLINK', userKey: 'user-key'}),
      headers: {'Content-Type': 'application/json'},
      method: 'POST',
    })

    const response = await invokeApiRoute(POST, request)

    expect(response.status).toBe(401)
    expect(repositoryMocks.revokeTossAppSessions).not.toHaveBeenCalled()
  })

  it('should reject an unauthorized GET callback', async () => {
    const response = await invokeApiRoute(
      GET,
      new Request('https://www.pomofi.io/api/app-auth/unlink?userKey=user-key&referrer=UNLINK'),
    )

    expect(response.status).toBe(401)
    expect(await response.text()).toBe('Unauthorized')
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

  it('should reject invalid GET callback parameters', async () => {
    const request = new Request(
      'https://www.pomofi.io/api/app-auth/unlink?referrer=WITHDRAWAL_TOSS',
      {headers: {Authorization: CALLBACK_AUTHORIZATION}},
    )

    const response = await invokeApiRoute(GET, request)

    expect(response.status).toBe(400)
    expect(await response.text()).toBe('Invalid unlink request')
  })

  it('should reject an oversized POST callback body', async () => {
    const request = new Request('https://www.pomofi.io/api/app-auth/unlink', {
      body: 'x'.repeat(4097),
      headers: {Authorization: CALLBACK_AUTHORIZATION, 'Content-Type': 'application/json'},
      method: 'POST',
    })

    const response = await invokeApiRoute(POST, request)

    expect(response.status).toBe(413)
    expect(await response.text()).toBe('Invalid unlink request')
    expect(repositoryMocks.revokeTossAppSessions).not.toHaveBeenCalled()
  })
})
