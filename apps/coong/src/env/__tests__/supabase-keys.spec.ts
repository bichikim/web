import {afterEach, describe, expect, it, vi} from 'vitest'

import {getSupabaseClientKeys} from '../supabase-keys'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('getSupabaseClientKeys', () => {
  it('should read the public Supabase client keys', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://db.example')
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'public-key')

    expect(getSupabaseClientKeys()).toEqual({key: 'public-key', url: 'https://db.example'})
  })

  it('should reject missing public Supabase client keys', () => {
    vi.stubEnv('VITE_SUPABASE_URL', undefined)
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', undefined)

    expect(() => getSupabaseClientKeys()).toThrow(
      'VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY is not set',
    )
  })
})
