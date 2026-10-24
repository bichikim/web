/** @vitest-environment jsdom */
import {query} from '@solidjs/router'
import {afterEach, expect, it, vi} from 'vitest'

const sessionMocks = vi.hoisted(() => ({readAccountSession: vi.fn()}))
const appSessionMocks = vi.hoisted(() => ({
  activateStoredSession: vi.fn(),
  clearStoredAppSession: vi.fn(),
  readStoredAppSession: vi.fn(),
  validateAppSession: vi.fn(),
}))

vi.mock('../web-session', () => ({readAccountSession: sessionMocks.readAccountSession}))
vi.mock('../app-session', () => ({
  activateStoredSession: appSessionMocks.activateStoredSession,
  clearStoredAppSession: appSessionMocks.clearStoredAppSession,
  readStoredAppSession: appSessionMocks.readStoredAppSession,
  validateAppSession: appSessionMocks.validateAppSession,
}))

import {accountSessionQuery, tossSessionQuery} from '../session-query'

afterEach(() => {
  query.clear()
  vi.restoreAllMocks()
  vi.resetAllMocks()
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

it('should resolve a valid Toss session without activation', async () => {
  appSessionMocks.readStoredAppSession.mockResolvedValue('token')
  appSessionMocks.validateAppSession.mockResolvedValue(true)

  await expect(tossSessionQuery()).resolves.toBe(true)
  expect(appSessionMocks.activateStoredSession).not.toHaveBeenCalled()
})

it('should resolve an absent Toss session without validation', async () => {
  appSessionMocks.readStoredAppSession.mockResolvedValue(null)

  await expect(tossSessionQuery()).resolves.toBe(false)
  expect(appSessionMocks.validateAppSession).not.toHaveBeenCalled()
  expect(appSessionMocks.activateStoredSession).not.toHaveBeenCalled()
})

it('should resolve a rejected Toss session as anonymous when storage cleanup fails', async () => {
  const cleanupError = new Error('storage unavailable')
  appSessionMocks.readStoredAppSession.mockResolvedValue('expired')
  appSessionMocks.validateAppSession.mockResolvedValue(false)
  appSessionMocks.activateStoredSession.mockResolvedValue(false)
  appSessionMocks.clearStoredAppSession.mockRejectedValue(cleanupError)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)

  await expect(tossSessionQuery()).resolves.toBe(false)
  expect(console.error).toHaveBeenCalledWith(
    'Failed to clear invalid Toss session from storage',
    cleanupError,
  )
})

it('should preserve Toss session infrastructure failures', () => {
  const error = new Error('session unavailable')
  appSessionMocks.readStoredAppSession.mockRejectedValue(error)

  return expect(tossSessionQuery()).rejects.toBe(error)
})

it('should activate a stored pending Toss session before discarding it', async () => {
  appSessionMocks.readStoredAppSession.mockResolvedValue('pending-token')
  appSessionMocks.validateAppSession.mockResolvedValue(false)
  appSessionMocks.activateStoredSession.mockResolvedValueOnce(true)

  await expect(tossSessionQuery()).resolves.toBe(true)
  expect(appSessionMocks.activateStoredSession).toHaveBeenCalledExactlyOnceWith('pending-token')
  expect(appSessionMocks.clearStoredAppSession).not.toHaveBeenCalled()
})

it('should clear a Toss session only after activation also rejects it', async () => {
  appSessionMocks.readStoredAppSession.mockResolvedValue('expired-token')
  appSessionMocks.validateAppSession.mockResolvedValue(false)
  appSessionMocks.activateStoredSession.mockResolvedValueOnce(false)
  appSessionMocks.clearStoredAppSession.mockResolvedValueOnce(undefined)

  await expect(tossSessionQuery()).resolves.toBe(false)
  expect(appSessionMocks.activateStoredSession).toHaveBeenCalledExactlyOnceWith('expired-token')
  expect(appSessionMocks.clearStoredAppSession).toHaveBeenCalledExactlyOnceWith('expired-token')
})

it('should preserve a pending Toss token when activation is unavailable', async () => {
  const error = new Error('activation unavailable')
  appSessionMocks.readStoredAppSession.mockResolvedValue('pending-token')
  appSessionMocks.validateAppSession.mockResolvedValue(false)
  appSessionMocks.activateStoredSession.mockRejectedValueOnce(error)

  await expect(tossSessionQuery()).rejects.toBe(error)
  expect(appSessionMocks.clearStoredAppSession).not.toHaveBeenCalled()
})
