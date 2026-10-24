import {beforeEach, describe, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({createSupabase: vi.fn()}))

vi.mock('src/utils/supabase', () => ({createSupabase: mocks.createSupabase}))

import {fetchDeleteAccount} from '../fetch-delete-account'

describe('fetchDeleteAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
})
