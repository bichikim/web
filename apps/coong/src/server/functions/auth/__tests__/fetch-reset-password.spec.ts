import {beforeEach, describe, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({createSupabase: vi.fn(), getSelfUrl: vi.fn()}))

vi.mock('src/env', () => ({getSelfUrl: mocks.getSelfUrl}))
vi.mock('src/utils/supabase', () => ({createSupabase: mocks.createSupabase}))

import {fetchResetPassword} from '../fetch-reset-password'

describe('fetchResetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getSelfUrl.mockReturnValue('https://coong.example')
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
})
