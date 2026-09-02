import {query} from '@solidjs/router'
import {afterEach, expect, it, vi} from 'vitest'

const sessionMocks = vi.hoisted(() => ({readAccountSession: vi.fn()}))

vi.mock('../web-session', () => ({readAccountSession: sessionMocks.readAccountSession}))

import {accountSessionQuery} from '../session-query'

afterEach(() => {
  query.clear()
  vi.clearAllMocks()
})

it('should return the current browser account session', async () => {
  const session = {email: 'user@example.com'}
  sessionMocks.readAccountSession.mockResolvedValueOnce(session)

  await expect(accountSessionQuery()).resolves.toBe(session)
  expect(sessionMocks.readAccountSession).toHaveBeenCalledOnce()
})

it('should preserve an anonymous session result', () => {
  sessionMocks.readAccountSession.mockResolvedValueOnce(null)

  return expect(accountSessionQuery()).resolves.toBeNull()
})

it('should deduplicate simultaneous session reads', async () => {
  const request = Promise.withResolvers<{readonly email: string}>()
  sessionMocks.readAccountSession.mockReturnValueOnce(request.promise)

  const firstResult = accountSessionQuery()
  const secondResult = accountSessionQuery()
  request.resolve({email: 'user@example.com'})

  await expect(firstResult).resolves.toEqual({email: 'user@example.com'})
  await expect(secondResult).resolves.toEqual({email: 'user@example.com'})
  expect(sessionMocks.readAccountSession).toHaveBeenCalledOnce()
})

it('should preserve the existing session adapter rejection contract', () => {
  const error = new Error('session unavailable')
  sessionMocks.readAccountSession.mockRejectedValueOnce(error)

  return expect(accountSessionQuery()).rejects.toBe(error)
})
