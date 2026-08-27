import {beforeEach, describe, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({createSupabase: vi.fn(), getSelfUrl: vi.fn()}))

vi.mock('@solidjs/router', () => ({action: vi.fn()}))
vi.mock('src/env', () => ({getSelfUrl: mocks.getSelfUrl}))
vi.mock('src/utils/supabase', () => ({createSupabase: mocks.createSupabase}))

import {fetchSignUp} from '../index'

describe('fetchSignUp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSelfUrl.mockReturnValue('https://coong.example/base')
  })

  it('should sign up with an absolute email redirect URL', async () => {
    const signUp = vi.fn().mockResolvedValue({data: {user: {id: 'user'}}, error: null})
    mocks.createSupabase.mockReturnValue({auth: {signUp}})

    await expect(
      fetchSignUp({email: 'user@example.com', password: 'secret', redirectTo: '/verified'}),
    ).resolves.toEqual({user: {id: 'user'}})
    expect(signUp).toHaveBeenCalledWith({
      email: 'user@example.com',
      options: {emailRedirectTo: 'https://coong.example/base/verified'},
      password: 'secret',
    })
  })

  it('should reject a Supabase sign-up error', () => {
    mocks.createSupabase.mockReturnValue({
      auth: {signUp: vi.fn().mockResolvedValue({data: null, error: {message: 'email exists'}})},
    })

    return expect(
      fetchSignUp({email: 'user@example.com', password: 'secret', redirectTo: '/verified'}),
    ).rejects.toThrow('email exists')
  })
})
