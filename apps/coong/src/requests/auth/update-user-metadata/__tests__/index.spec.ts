import {beforeEach, describe, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({createSupabase: vi.fn()}))

vi.mock('@solidjs/router', () => ({action: vi.fn()}))
vi.mock('src/utils/supabase', () => ({createSupabase: mocks.createSupabase}))

import {fetchUpdateUserMetadata} from '../index'

describe('fetchUpdateUserMetadata', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should update metadata for an authenticated user', async () => {
    const updateUser = vi.fn().mockResolvedValue({data: {user: {id: 'user'}}, error: null})
    mocks.createSupabase.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({data: {user: {id: 'user'}}, error: null}),
        updateUser,
      },
    })

    await expect(fetchUpdateUserMetadata({role: 'admin'})).resolves.toEqual({user: {id: 'user'}})
    expect(updateUser).toHaveBeenCalledWith({data: {role: 'admin'}})
  })

  it.each([
    {data: {user: null}, error: null},
    {data: {user: {id: 'user'}}, error: {message: 'session failed'}},
  ])('should reject an unauthenticated user', ({data, error}) => {
    mocks.createSupabase.mockReturnValue({
      auth: {getUser: vi.fn().mockResolvedValue({data, error})},
    })

    return expect(fetchUpdateUserMetadata({role: 'admin'})).rejects.toThrow('Unauthorized')
  })

  it('should reject a metadata update error', () => {
    mocks.createSupabase.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({data: {user: {id: 'user'}}, error: null}),
        updateUser: vi.fn().mockResolvedValue({data: null, error: {message: 'blocked'}}),
      },
    })

    return expect(fetchUpdateUserMetadata({role: 'admin'})).rejects.toThrow('blocked')
  })
})
