/**
 * @vitest-environment jsdom
 */
import {render} from '@solidjs/testing-library'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {type AuthContext, AuthProvider, useAuth} from '../index'

const routerMocks = vi.hoisted(() => {
  const actionHandlers = {
    'auth/change-password': vi.fn(),
    'auth/delete-account': vi.fn(),
    'auth/reset-password': vi.fn(),
    'auth/sign-in': vi.fn(),
    'auth/sign-out': vi.fn(),
    'auth/verify-otp': vi.fn(),
  }

  return {
    action: vi.fn((_: unknown, name: string) => ({name})),
    actionHandlers,
    createAsync: vi.fn(() => Object.assign(() => null, {latest: null})),
    query: vi.fn((queryFunction: unknown, name: string) =>
      Object.assign(queryFunction as object, {key: name}),
    ),
    revalidate: vi.fn(),
    useAction: vi.fn((action: {name: keyof typeof actionHandlers}) => actionHandlers[action.name]),
  }
})

vi.mock('@solidjs/router', () => routerMocks)

let authContext: AuthContext | undefined

const AuthConsumer = () => {
  authContext = useAuth()

  return null
}

const renderAuthProvider = () => {
  render(() => (
    <AuthProvider>
      <AuthConsumer />
    </AuthProvider>
  ))
}

const getAuthContext = () => {
  if (!authContext) {
    throw new Error('Auth context was not initialized')
  }

  return authContext
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authContext = undefined

    routerMocks.actionHandlers['auth/change-password'].mockResolvedValue(null)
    routerMocks.actionHandlers['auth/delete-account'].mockResolvedValue({success: true})
    routerMocks.actionHandlers['auth/reset-password'].mockResolvedValue(undefined)
    routerMocks.actionHandlers['auth/sign-in'].mockResolvedValue({session: null, user: null})
    routerMocks.actionHandlers['auth/sign-out'].mockResolvedValue(undefined)
    routerMocks.actionHandlers['auth/verify-otp'].mockResolvedValue(null)
    routerMocks.revalidate.mockResolvedValue(undefined)
  })

  it('should revalidate the auth user query after sign in', async () => {
    renderAuthProvider()

    const signInResult = await getAuthContext().signInWithPassword({
      email: 'user@example.com',
      password: 'password',
    })

    expect(signInResult).toEqual({session: null, user: null})
    expect(routerMocks.actionHandlers['auth/sign-in']).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password',
    })
    expect(routerMocks.revalidate).toHaveBeenCalledWith('auth/user')
  })

  it('should revalidate the auth user query after session mutations', async () => {
    renderAuthProvider()

    const auth = getAuthContext()

    await auth.verifyOtp({tokenHash: 'token-hash', type: 'signup'})
    await auth.signOut()
    await auth.deleteAccount()

    expect(routerMocks.revalidate).toHaveBeenCalledTimes(3)
    expect(routerMocks.revalidate).toHaveBeenNthCalledWith(1, 'auth/user')
    expect(routerMocks.revalidate).toHaveBeenNthCalledWith(2, 'auth/user')
    expect(routerMocks.revalidate).toHaveBeenNthCalledWith(3, 'auth/user')
  })

  it('should not revalidate the auth user query when sign in fails', async () => {
    const error = new Error('Invalid credentials')
    routerMocks.actionHandlers['auth/sign-in'].mockRejectedValueOnce(error)

    renderAuthProvider()

    await expect(
      getAuthContext().signInWithPassword({
        email: 'user@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toThrow(error)

    expect(routerMocks.revalidate).not.toHaveBeenCalled()
  })
})
