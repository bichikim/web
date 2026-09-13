import {beforeEach, describe, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({createSupabase: vi.fn()}))

vi.mock('src/utils/supabase', () => ({createSupabase: mocks.createSupabase}))

import {fetchSignOut} from '../fetch-sign-out'

describe('fetchSignOut', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
})
