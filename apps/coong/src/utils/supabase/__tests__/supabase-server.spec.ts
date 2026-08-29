import {beforeEach, describe, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getSupabaseClientKeys: vi.fn(),
  parseCookieHeader: vi.fn(),
  serializeCookieHeader: vi.fn(),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: mocks.createServerClient,
  parseCookieHeader: mocks.parseCookieHeader,
  serializeCookieHeader: mocks.serializeCookieHeader,
}))
vi.mock('src/env', () => ({getSupabaseClientKeys: mocks.getSupabaseClientKeys}))

import {createSupabaseServer} from '../supabase-server'

describe('createSupabaseServer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should bridge request and response cookies to the server client', () => {
    const client = {name: 'server-client'}
    mocks.getSupabaseClientKeys.mockReturnValue({key: 'public-key', url: 'https://db.example'})
    mocks.createServerClient.mockReturnValue(client)
    mocks.parseCookieHeader.mockReturnValue([
      {name: 'session', value: 'token'},
      {name: 'empty', value: undefined},
    ])
    mocks.serializeCookieHeader.mockReturnValue('session=next')
    const event = {
      request: new Request('https://coong.example', {headers: {Cookie: 'session=token'}}),
      response: {headers: new Headers()},
    }

    expect(createSupabaseServer(event as never)).toBe(client)
    const [, , options] = mocks.createServerClient.mock.calls.at(-1)!

    expect(options.cookies.getAll()).toEqual([
      {name: 'session', value: 'token'},
      {name: 'empty', value: ''},
    ])
    options.cookies.setAll([{name: 'session', options: {}, value: 'next'}])
    expect(event.response.headers.get('Set-Cookie')).toBe('session=next')
  })

  it('should tolerate response headers that can no longer be changed', () => {
    mocks.getSupabaseClientKeys.mockReturnValue({key: 'public-key', url: 'https://db.example'})
    mocks.createServerClient.mockReturnValue({})
    mocks.serializeCookieHeader.mockReturnValue('session=next')
    const event = {
      request: new Request('https://coong.example'),
      response: {
        headers: {
          append: vi.fn(() => {
            throw new Error('headers sent')
          }),
        },
      },
    }

    createSupabaseServer(event as never)
    const [, , options] = mocks.createServerClient.mock.calls.at(-1)!

    expect(() =>
      options.cookies.setAll([{name: 'session', options: {}, value: 'next'}]),
    ).not.toThrow()
  })
})
