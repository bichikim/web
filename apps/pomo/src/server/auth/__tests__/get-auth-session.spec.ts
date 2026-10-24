/** @vitest-environment node */
import {AsyncLocalStorage} from 'node:async_hooks'
import {beforeEach, expect, it, vi} from 'vitest'

import {getAuthSession} from '../get-auth-session'
import type {RequestAuthentication} from '../types'

const mocks = vi.hoisted(() => ({
  authenticateAppRequest: vi.fn(),
  getNeonSession: vi.fn(),
  getRequestEvent: vi.fn(),
}))

vi.mock('solid-js/web', () => ({getRequestEvent: mocks.getRequestEvent}))
vi.mock('src/server/auth/authenticate-app-request', () => ({
  authenticateAppRequest: mocks.authenticateAppRequest,
}))
vi.mock('../get-neon-session', () => ({getNeonSession: mocks.getNeonSession}))

beforeEach(() => {
  vi.resetAllMocks()
})

it('should share an in-flight session only within the matching request context', async () => {
  const request = new Request('https://pomo.example/admin')
  const authentication: RequestAuthentication = {request}
  mocks.getRequestEvent.mockReturnValue({locals: {authentication}})
  const session = {
    access: 'anonymous',
    identity: null,
    provider: 'neon',
    setCookies: [],
  }
  mocks.getNeonSession.mockResolvedValue(session)

  const first = getAuthSession(request)
  const second = getAuthSession(request)
  expect(second).toBe(first)
  await expect(first).resolves.toEqual(session)
  expect(mocks.getNeonSession).toHaveBeenCalledOnce()

  const other = new Request(request)
  await getAuthSession(other)
  expect(mocks.getNeonSession).toHaveBeenCalledTimes(2)
  mocks.getRequestEvent.mockReturnValue({locals: {authentication: {request: other}}})
  await getAuthSession(other)
  expect(mocks.getNeonSession).toHaveBeenCalledTimes(3)
})

it('should retain a failed lookup for the rest of the request', async () => {
  const request = new Request('https://pomo.example/admin')
  mocks.getRequestEvent.mockReturnValue({locals: {authentication: {request}}})
  const error = new Error('provider unavailable')
  mocks.getNeonSession.mockRejectedValue(error)
  await expect(getAuthSession(request)).rejects.toBe(error)
  await expect(getAuthSession(request)).rejects.toBe(error)
  expect(mocks.getNeonSession).toHaveBeenCalledOnce()
})

it('should isolate concurrent users and their refreshed cookies', async () => {
  const storage = new AsyncLocalStorage<{locals: {authentication: RequestAuthentication}}>()
  mocks.getRequestEvent.mockImplementation(() => storage.getStore())
  const first = Promise.withResolvers<unknown>()
  const second = Promise.withResolvers<unknown>()
  mocks.getNeonSession.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
  const run = (name: string) => {
    const request = new Request('https://pomo.example/api/account', {headers: {Cookie: name}})
    return storage.run({locals: {authentication: {request}}}, async () => {
      const pending = getAuthSession(request)
      await Promise.resolve()
      expect(getAuthSession(request)).toBe(pending)
      return pending
    })
  }
  const firstResult = run('first')
  const secondResult = run('second')
  second.resolve({
    access: 'user',
    identity: {id: 'second'},
    provider: 'neon',
    setCookies: ['session=second'],
  })
  first.resolve({
    access: 'user',
    identity: {id: 'first'},
    provider: 'neon',
    setCookies: ['session=first'],
  })
  await expect(firstResult).resolves.toMatchObject({
    access: 'user',
    identity: {id: 'first'},
    setCookies: ['session=first'],
  })
  await expect(secondResult).resolves.toMatchObject({
    access: 'user',
    identity: {id: 'second'},
    setCookies: ['session=second'],
  })
  expect(mocks.getNeonSession).toHaveBeenCalledTimes(2)
})

it.each([
  ['app-user', 'user'],
  [null, 'anonymous'],
] as const)('should map a Toss identity %s to %s admin access', async (userId, access) => {
  mocks.authenticateAppRequest.mockResolvedValue(userId === null ? null : {token: 'token', userId})
  const request = new Request('https://pomo.example/api/account', {
    headers: {Authorization: 'Bearer token', Cookie: 'session=admin'},
  })
  await expect(getAuthSession(request)).resolves.toEqual({
    access,
    provider: 'toss',
    setCookies: [],
    userId,
  })
  expect(mocks.getNeonSession).not.toHaveBeenCalled()
})

it('should use the explicitly requested Neon provider when a bearer header is also present', async () => {
  const request = new Request('https://pomo.example/admin', {
    headers: {Authorization: 'Bearer app-token', Cookie: 'session=admin'},
  })
  const session = {
    access: 'admin',
    identity: {email: 'admin@example.com', id: 'admin'},
    provider: 'neon',
    setCookies: ['session=updated'],
  }
  mocks.getNeonSession.mockResolvedValue(session)

  await expect(getAuthSession(request, {provider: 'neon'})).resolves.toEqual(session)
  expect(mocks.getNeonSession).toHaveBeenCalledWith(request)
  expect(mocks.authenticateAppRequest).not.toHaveBeenCalled()
})
