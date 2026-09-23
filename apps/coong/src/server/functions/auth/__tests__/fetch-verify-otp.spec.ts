import {beforeEach, describe, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({createSupabase: vi.fn()}))

vi.mock('src/utils/supabase', () => ({createSupabase: mocks.createSupabase}))

import {fetchVerifyOtp} from '../fetch-verify-otp'

describe('fetchVerifyOtp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
