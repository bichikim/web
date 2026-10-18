/** @vitest-environment node */
import {EventEmitter} from 'node:events'

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

const dependencyMocks = vi.hoisted(() => ({
  createPendingTossAppSession: vi.fn(),
  createTossAppSession: vi.fn(),
  httpsRequest: vi.fn(),
}))

vi.mock('node:https', () => ({request: dependencyMocks.httpsRequest}))
vi.mock('src/env', () => ({
  env: {POMO_TOSS_MTLS_CERT: 'fixture-certificate', POMO_TOSS_MTLS_KEY: 'fixture-key'},
}))
vi.mock('src/server/auth/app-session', () => ({
  createPendingTossAppSession: dependencyMocks.createPendingTossAppSession,
  createTossAppSession: dependencyMocks.createTossAppSession,
}))

import {POST, PUT} from '../exchange'
import {invokeApiRoute} from '../../__tests__/invoke'

const TOKEN_BODY = JSON.stringify({resultType: 'SUCCESS', success: {accessToken: 'fixture-token'}})
const USER_BODY = JSON.stringify({resultType: 'SUCCESS', success: {userKey: 'fixture-user'}})

const createRequest = (method: 'POST' | 'PUT'): Request =>
  new Request('https://www.pomofi.io/api/app-auth/exchange', {
    body: JSON.stringify({authorizationCode: 'fixture-code', referrer: 'SANDBOX'}),
    headers: {'Content-Type': 'application/json'},
    method,
  })

const queueResponses = (bodies: ReadonlyArray<string>) => {
  const completion = Promise.withResolvers<unknown>()
  let responseIndex = 0
  dependencyMocks.httpsRequest.mockImplementation(
    (_url: URL, _options: unknown, onResponse: (response: EventEmitter) => void) => {
      const body = bodies[responseIndex]
      responseIndex += 1
      const response = Object.assign(new EventEmitter(), {statusCode: 200})
      const request = Object.assign(new EventEmitter(), {
        end: vi.fn(() => {
          queueMicrotask(() => {
            response.emit('data', Buffer.from(body ?? ''))
            try {
              response.emit('end')
              if (responseIndex === bodies.length) {
                completion.resolve(undefined)
              }
            } catch (error: unknown) {
              completion.resolve(error)
            }
          })
        }),
        setTimeout: vi.fn(),
        write: vi.fn(),
      })
      onResponse(response)
      return request
    },
  )
  return completion.promise
}

beforeEach(() => {
  vi.clearAllMocks()
  dependencyMocks.httpsRequest.mockReset()
  dependencyMocks.createPendingTossAppSession.mockResolvedValue({
    expiresAt: new Date('2026-10-21T00:00:00.000Z'),
    token: 'fixture-session',
    userId: 'fixture-pomo-user',
  })
  dependencyMocks.createTossAppSession.mockResolvedValue({
    expiresAt: new Date('2026-10-21T00:00:00.000Z'),
    token: 'fixture-session',
    userId: 'fixture-pomo-user',
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe.each([
  {handler: POST, method: 'POST'},
  {handler: PUT, method: 'PUT'},
] as const)('Toss $method exchange through its HTTPS adapter', ({handler, method}) => {
  it.each([
    {bodies: ['not-json'], stage: 'token'},
    {bodies: [TOKEN_BODY, 'not-json'], stage: 'user'},
  ])('should finish with login_failed for malformed $stage JSON', async ({bodies}) => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const completed = queueResponses(bodies)
    const exchange = invokeApiRoute(handler, createRequest(method))

    await expect(completed).resolves.toBeUndefined()
    const response = await exchange

    expect(response.status).toBe(502)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    await expect(response.json()).resolves.toEqual({error: 'login_failed'})
    expect(consoleError).toHaveBeenCalledWith(
      'Toss login exchange failed',
      expect.objectContaining({message: 'Toss returned an invalid JSON response'}),
    )
    expect(dependencyMocks.httpsRequest).toHaveBeenCalledTimes(bodies.length)
    expect(dependencyMocks.createPendingTossAppSession).not.toHaveBeenCalled()
    expect(dependencyMocks.createTossAppSession).not.toHaveBeenCalled()
  })

  it('should preserve a successful login through token and user responses', async () => {
    const completed = queueResponses([TOKEN_BODY, USER_BODY])
    const exchange = invokeApiRoute(handler, createRequest(method))

    await expect(completed).resolves.toBeUndefined()
    const response = await exchange

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      expiresAt: '2026-10-21T00:00:00.000Z',
      token: 'fixture-session',
      userId: 'fixture-pomo-user',
    })
    const createSession =
      method === 'POST'
        ? dependencyMocks.createTossAppSession
        : dependencyMocks.createPendingTossAppSession
    const otherSession =
      method === 'POST'
        ? dependencyMocks.createPendingTossAppSession
        : dependencyMocks.createTossAppSession
    expect(createSession).toHaveBeenCalledExactlyOnceWith('fixture-user')
    expect(otherSession).not.toHaveBeenCalled()
    expect(dependencyMocks.httpsRequest).toHaveBeenCalledTimes(2)
  })
})
