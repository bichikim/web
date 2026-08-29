import {beforeEach, describe, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({createSupabase: vi.fn(), getSelfUrl: vi.fn()}))

vi.mock('@solidjs/router', () => ({action: vi.fn(), query: vi.fn()}))
vi.mock('src/env', () => ({getSelfUrl: mocks.getSelfUrl}))
vi.mock('src/utils/supabase', () => ({createSupabase: mocks.createSupabase}))

import {fetchChangePassword} from '../change-password'
import {fetchDeleteAccount} from '../delete-account'
import {fetchResetPassword} from '../reset-password'
import {fetchSignIn} from '../sign-in'
import {fetchSignOut} from '../sign-out'
import {fetchUser} from '../user'
import {fetchVerifyOtp} from '../verify-otp'

describe('auth requests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSelfUrl.mockReturnValue('https://coong.example')
  })

  it('should change a user password', async () => {
    const user = {id: 'user'}
    const updateUser = vi.fn().mockResolvedValue({data: {user}, error: null})
    mocks.createSupabase.mockReturnValue({auth: {updateUser}})

    await expect(fetchChangePassword('new-password')).resolves.toBe(user)
    expect(updateUser).toHaveBeenCalledWith({password: 'new-password'})
  })

  it('should reject a password change error', () => {
    mocks.createSupabase.mockReturnValue({
      auth: {updateUser: vi.fn().mockResolvedValue({data: {}, error: {message: 'change failed'}})},
    })

    return expect(fetchChangePassword('new-password')).rejects.toThrow('change failed')
  })

  it('should delete the account before signing out', async () => {
    const rpc = vi.fn().mockResolvedValue({error: null})
    const signOut = vi.fn().mockResolvedValue({error: null})
    mocks.createSupabase.mockReturnValue({auth: {signOut}, rpc})

    await expect(fetchDeleteAccount()).resolves.toEqual({success: true})
    expect(rpc).toHaveBeenCalledWith('delete_account')
    expect(signOut).toHaveBeenCalledOnce()
  })

  it.each([
    [
      'delete failed',
      {
        auth: {signOut: vi.fn()},
        rpc: vi.fn().mockResolvedValue({error: {message: 'delete failed'}}),
      },
    ],
    [
      'sign-out failed',
      {
        auth: {signOut: vi.fn().mockResolvedValue({error: {message: 'sign-out failed'}})},
        rpc: vi.fn().mockResolvedValue({error: null}),
      },
    ],
  ])('should reject an account deletion error', (message, client) => {
    mocks.createSupabase.mockReturnValue(client)

    return expect(fetchDeleteAccount()).rejects.toThrow(message)
  })

  it('should request a password recovery email', async () => {
    const resetPasswordForEmail = vi.fn().mockResolvedValue({error: null})
    mocks.createSupabase.mockReturnValue({auth: {resetPasswordForEmail}})

    await expect(fetchResetPassword('user@example.com')).resolves.toBeUndefined()
    expect(resetPasswordForEmail).toHaveBeenCalledWith('user@example.com', {
      redirectTo: 'https://coong.example/auth/verify-email',
    })
  })

  it('should reject a password recovery error', () => {
    mocks.createSupabase.mockReturnValue({
      auth: {resetPasswordForEmail: vi.fn().mockResolvedValue({error: {message: 'reset failed'}})},
    })

    return expect(fetchResetPassword('user@example.com')).rejects.toThrow('reset failed')
  })

  it('should sign in with an email and password', async () => {
    const data = {session: {access_token: 'token'}, user: {id: 'user'}}
    const signInWithPassword = vi.fn().mockResolvedValue({data, error: null})
    mocks.createSupabase.mockReturnValue({auth: {signInWithPassword}})

    await expect(fetchSignIn({email: 'user@example.com', password: 'secret'})).resolves.toBe(data)
    expect(signInWithPassword).toHaveBeenCalledWith({email: 'user@example.com', password: 'secret'})
  })

  it('should reject a sign-in error', () => {
    mocks.createSupabase.mockReturnValue({
      auth: {
        signInWithPassword: vi.fn().mockResolvedValue({data: null, error: {message: 'invalid'}}),
      },
    })

    return expect(fetchSignIn({email: 'user@example.com', password: 'secret'})).rejects.toThrow(
      'invalid',
    )
  })

  it('should sign out the current user', async () => {
    const signOut = vi.fn().mockResolvedValue({error: null})
    mocks.createSupabase.mockReturnValue({auth: {signOut}})

    await expect(fetchSignOut()).resolves.toBeUndefined()
    expect(signOut).toHaveBeenCalledOnce()
  })

  it('should reject a sign-out error', () => {
    mocks.createSupabase.mockReturnValue({
      auth: {signOut: vi.fn().mockResolvedValue({error: {message: 'sign-out failed'}})},
    })

    return expect(fetchSignOut()).rejects.toThrow('sign-out failed')
  })

  it('should return the authenticated user', async () => {
    const user = {id: 'user'}
    mocks.createSupabase.mockReturnValue({
      auth: {getUser: vi.fn().mockResolvedValue({data: {user}})},
    })

    await expect(fetchUser()).resolves.toBe(user)
  })

  it('should verify an email token hash', async () => {
    const user = {id: 'user'}
    const verifyOtp = vi.fn().mockResolvedValue({data: {user}, error: null})
    mocks.createSupabase.mockReturnValue({auth: {verifyOtp}})

    await expect(fetchVerifyOtp({tokenHash: 'hash', type: 'email'})).resolves.toBe(user)
    expect(verifyOtp).toHaveBeenCalledWith({token_hash: 'hash', type: 'email'})
  })

  it('should reject an OTP verification error', () => {
    mocks.createSupabase.mockReturnValue({
      auth: {verifyOtp: vi.fn().mockResolvedValue({data: null, error: {message: 'expired'}})},
    })

    return expect(fetchVerifyOtp({tokenHash: 'hash', type: 'email'})).rejects.toThrow('expired')
  })
})
