import {beforeEach, describe, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({createSupabase: vi.fn()}))

vi.mock('src/utils/supabase', () => ({createSupabase: mocks.createSupabase}))

import {fetchSignIn} from '../fetch-sign-in'

describe('fetchSignIn', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
})
