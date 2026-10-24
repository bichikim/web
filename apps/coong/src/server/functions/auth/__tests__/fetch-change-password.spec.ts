import {beforeEach, describe, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({createSupabase: vi.fn()}))

vi.mock('src/utils/supabase', () => ({createSupabase: mocks.createSupabase}))

import {fetchChangePassword} from '../fetch-change-password'

describe('fetchChangePassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
})
