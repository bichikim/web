/** @vitest-environment jsdom */

import {render, renderHook, screen} from '@solidjs/testing-library'
import {createAsync, Navigate, useCurrentMatches} from '@solidjs/router'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {AuthGuard, useAuthGuard as useAuthGuardFromIndex} from '../index'
import {useAuthGuard} from '../use-auth-guard'

vi.mock('@solidjs/router', () => ({
  createAsync: vi.fn(),
  Navigate: vi.fn(),
  useCurrentMatches: vi.fn(),
}))

vi.mock('src/requests/auth/user', () => ({
  userQuery: vi.fn(),
}))

afterEach(() => {
  vi.clearAllMocks()
})

const configureAuth = (user: unknown, publicValue: boolean | 'only-unauthorized') => {
  vi.mocked(createAsync).mockReturnValue((() => user) as unknown as ReturnType<typeof createAsync>)
  vi.mocked(useCurrentMatches).mockReturnValue(
    () =>
      [{route: {info: {public: publicValue}}}] as unknown as ReturnType<
        ReturnType<typeof useCurrentMatches>
      >,
  )
  vi.mocked(Navigate).mockImplementation(
    (props) => (<span>redirect:{String(props.href)}</span>) as never,
  )
}

describe('useAuthGuard', () => {
  it('should expose route access from both public hook entry points', () => {
    configureAuth({id: 'user'}, false)

    const standalone = renderHook(() => useAuthGuard())
    const bundled = renderHook(() => useAuthGuardFromIndex())

    expect(standalone.result()).toMatchObject({allow: true, pending: false})
    expect(bundled.result()).toMatchObject({allow: true, pending: false})
  })
})

describe('AuthGuard', () => {
  it('should render pending content while authentication is loading', () => {
    configureAuth(undefined, false)

    render(() => <AuthGuard pending={<span>loading</span>}>protected</AuthGuard>)

    expect(screen.getByText('loading')).toBeInTheDocument()
    expect(screen.queryByText('protected')).not.toBeInTheDocument()
  })

  it('should render children when access is allowed', () => {
    configureAuth({id: 'user'}, false)

    render(() => <AuthGuard>protected</AuthGuard>)

    expect(screen.getByText('protected')).toBeInTheDocument()
  })

  it('should redirect denied access to the configured destination', () => {
    configureAuth({id: 'user'}, 'only-unauthorized')

    render(() => <AuthGuard homeUrl="/home">protected</AuthGuard>)

    expect(screen.getByText('redirect:/home')).toBeInTheDocument()
  })
})
