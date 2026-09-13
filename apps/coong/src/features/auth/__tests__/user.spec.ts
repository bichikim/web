import {beforeEach, describe, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({createSupabase: vi.fn()}))

vi.mock('src/utils/supabase', () => ({createSupabase: mocks.createSupabase}))

import {fetchUser} from '../user'

describe('fetchUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return the authenticated user', async () => {
    const user = {id: 'user'}
    mocks.createSupabase.mockReturnValue({
      auth: {getUser: vi.fn().mockResolvedValue({data: {user}})},
    })

    await expect(fetchUser()).resolves.toBe(user)
  })
})
