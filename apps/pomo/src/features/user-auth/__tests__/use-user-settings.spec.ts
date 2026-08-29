/** @vitest-environment jsdom */

import {renderHook, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({
  clearStoredAppSession: vi.fn(),
  readAccountSession: vi.fn(),
  readStoredAppSession: vi.fn(),
  validateAppSession: vi.fn(),
}))

vi.mock('../app-session', () => ({
  clearStoredAppSession: mocks.clearStoredAppSession,
  readStoredAppSession: mocks.readStoredAppSession,
  validateAppSession: mocks.validateAppSession,
}))
vi.mock('../web-session', () => ({readAccountSession: mocks.readAccountSession}))

import {useUserSettings} from '../use-user-settings'

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', '')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

it('should expose loading then anonymous web state', async () => {
  mocks.readAccountSession.mockResolvedValue(null)
  const {result} = renderHook(useUserSettings)

  expect(result.state()).toEqual({kind: 'loading'})
  expect(result.authenticatedUser()).toBeNull()
  expect(result.authenticatedEmail()).toBeNull()
  await waitFor(() => expect(result.state()).toEqual({kind: 'anonymous'}))
})

it('should expose an authenticated email account', async () => {
  mocks.readAccountSession.mockResolvedValue({email: 'user@example.com'})
  const {result} = renderHook(useUserSettings)

  await waitFor(() =>
    expect(result.authenticatedUser()).toEqual({
      email: 'user@example.com',
      kind: 'authenticated',
      provider: 'email',
    }),
  )
  expect(result.authenticatedEmail()).toBe('user@example.com')
})

it('should expose account loading failures', async () => {
  mocks.readAccountSession.mockRejectedValue(new Error('unavailable'))
  const {result} = renderHook(useUserSettings)

  await waitFor(() => expect(result.state()).toEqual({kind: 'error'}))
})

it('should expose anonymous Toss state without a stored session', async () => {
  vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', 'true')
  mocks.readStoredAppSession.mockResolvedValue(null)
  const {result} = renderHook(useUserSettings)

  await waitFor(() => expect(result.state()).toEqual({kind: 'anonymous'}))
  expect(mocks.validateAppSession).not.toHaveBeenCalled()
})

it('should expose a valid Toss session without an email', async () => {
  vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', 'true')
  mocks.readStoredAppSession.mockResolvedValue('token')
  mocks.validateAppSession.mockResolvedValue(true)
  const {result} = renderHook(useUserSettings)

  await waitFor(() =>
    expect(result.authenticatedUser()).toEqual({kind: 'authenticated', provider: 'toss'}),
  )
  expect(result.authenticatedEmail()).toBeNull()
})

it('should clear an invalid Toss session and become anonymous', async () => {
  vi.stubEnv('VITE_POMO_IS_APPS_IN_TOSS', 'true')
  mocks.readStoredAppSession.mockResolvedValue('expired')
  mocks.validateAppSession.mockResolvedValue(false)
  mocks.clearStoredAppSession.mockResolvedValue(undefined)
  const {result} = renderHook(useUserSettings)

  await waitFor(() => expect(result.state()).toEqual({kind: 'anonymous'}))
  expect(mocks.clearStoredAppSession).toHaveBeenCalledOnce()
})
