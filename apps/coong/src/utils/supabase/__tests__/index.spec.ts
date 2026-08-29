/** @vitest-environment jsdom */

import {describe, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({createBrowserClient: vi.fn(), getSupabaseClientKeys: vi.fn()}))

vi.mock('@supabase/ssr', () => ({createBrowserClient: mocks.createBrowserClient}))
vi.mock('src/env', () => ({getSupabaseClientKeys: mocks.getSupabaseClientKeys}))

import {createSupabase} from '../index'

describe('createSupabase', () => {
  it('should create a browser client from public Supabase keys', () => {
    const client = {name: 'browser-client'}
    mocks.getSupabaseClientKeys.mockReturnValue({key: 'public-key', url: 'https://db.example'})
    mocks.createBrowserClient.mockReturnValue(client)

    expect(createSupabase()).toBe(client)
    expect(mocks.createBrowserClient).toHaveBeenCalledWith('https://db.example', 'public-key')
  })
})
