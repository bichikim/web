/** @vitest-environment node */
import {beforeEach, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({
  createBrowserClient: vi.fn(),
  createSupabaseServer: vi.fn(),
  getRequestEvent: vi.fn(),
  getSupabaseClientKeys: vi.fn(),
}))

vi.mock('@supabase/ssr', () => ({createBrowserClient: mocks.createBrowserClient}))
vi.mock('solid-js/web', () => ({getRequestEvent: mocks.getRequestEvent, isServer: true}))
vi.mock('src/env', () => ({getSupabaseClientKeys: mocks.getSupabaseClientKeys}))
vi.mock('../supabase-server', () => ({createSupabaseServer: mocks.createSupabaseServer}))

import {createSupabase} from '..'

beforeEach(() => {
  vi.resetAllMocks()
  mocks.getSupabaseClientKeys.mockReturnValue({key: 'public-key', url: 'https://db.example'})
})

it('should reject client creation outside a server request', () => {
  expect(() => createSupabase()).toThrow('No event found')
  expect(mocks.createSupabaseServer).not.toHaveBeenCalled()
  expect(mocks.createBrowserClient).not.toHaveBeenCalled()
})

it('should reuse the client attached to the current server request', () => {
  const client = {name: 'request-client'}
  mocks.getRequestEvent.mockReturnValue({locals: {supabase: client}})

  expect(createSupabase()).toBe(client)
  expect(mocks.createSupabaseServer).not.toHaveBeenCalled()
  expect(mocks.createBrowserClient).not.toHaveBeenCalled()
})

it('should create a server client from the current request when none is attached', () => {
  const event = {locals: {}}
  const client = {name: 'server-client'}
  mocks.getRequestEvent.mockReturnValue(event)
  mocks.createSupabaseServer.mockReturnValue(client)

  expect(createSupabase()).toBe(client)
  expect(mocks.createSupabaseServer).toHaveBeenCalledWith(event)
  expect(mocks.createBrowserClient).not.toHaveBeenCalled()
})
