/** @vitest-environment jsdom */

import {MemoryRouter} from '@solidjs/router'
import {render, waitFor} from '@solidjs/testing-library'
import {beforeEach, expect, it, vi} from 'vitest'

import type {AuthenticatedSession} from '../machine'
import {type AuthController, createAuthenticationController} from '../controller'

const loadSession = vi.fn<() => Promise<AuthenticatedSession | null>>()

beforeEach(() => {
  vi.clearAllMocks()
})

it('should resolve an authenticated session through the provided loader', async () => {
  loadSession.mockResolvedValue({
    email: 'user@example.com',
    kind: 'authenticated',
    provider: 'email',
  })
  const authentication = renderController()

  expect(authentication.current?.state()).toEqual({kind: 'checking'})
  await waitFor(() =>
    expect(authentication.current?.state()).toEqual({
      email: 'user@example.com',
      kind: 'authenticated',
      provider: 'email',
    }),
  )
  expect(authentication.current?.session()).toEqual({
    email: 'user@example.com',
    kind: 'authenticated',
    provider: 'email',
  })
  expect(loadSession).toHaveBeenCalledOnce()
})

it('should distinguish an absent session from an unavailable loader', async () => {
  loadSession.mockResolvedValueOnce(null)
  const anonymousAuthentication = renderController()

  await waitFor(() => expect(anonymousAuthentication.current?.state()).toEqual({kind: 'anonymous'}))
  anonymousAuthentication.unmount()

  loadSession.mockRejectedValueOnce(new Error('unavailable'))
  const unavailableAuthentication = renderController()

  await waitFor(() =>
    expect(unavailableAuthentication.current?.state()).toEqual({kind: 'unavailable'}),
  )
})

const renderController = () => {
  const authentication: {current?: AuthController} = {}
  const result = render(() => (
    <MemoryRouter
      root={() => {
        authentication.current = createAuthenticationController({loadSession})
        return null
      }}
    />
  ))

  return {
    get current() {
      return authentication.current
    },
    unmount: result.unmount,
  }
}
