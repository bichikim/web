/** @vitest-environment jsdom */

import {describe, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({createBrowserClient: vi.fn(), getSupabaseClientKeys: vi.fn()}))

vi.mock('@supabase/ssr', () => ({createBrowserClient: mocks.createBrowserClient}))
vi.mock('src/env', () => ({getSupabaseClientKeys: mocks.getSupabaseClientKeys}))

import {useSupabase} from '../index'

describe('useSupabase', () => {
  it('should create a browser Supabase client from public keys', () => {
    const client = {name: 'browser-client'}
    mocks.getSupabaseClientKeys.mockReturnValue({key: 'public-key', url: 'https://db.example'})
    mocks.createBrowserClient.mockReturnValue(client)

    expect(useSupabase()).toBe(client)
    expect(mocks.createBrowserClient).toHaveBeenCalledWith('https://db.example', 'public-key')
  })
})
