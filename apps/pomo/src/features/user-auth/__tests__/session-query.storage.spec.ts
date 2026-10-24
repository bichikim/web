/** @vitest-environment jsdom */
import {query} from '@solidjs/router'
import {afterEach, expect, it, vi} from 'vitest'

vi.mock('@apps-in-toss/web-framework', () => ({
  Storage: {getItem: vi.fn(), removeItem: vi.fn(), setItem: vi.fn()},
  TossAuth: {login: vi.fn()},
}))

import {Storage, TossAuth} from '@apps-in-toss/web-framework'
import {createTossLoginSession, readStoredAppSession} from '../app-session'
import {tossSessionQuery} from '../session-query'

afterEach(() => {
  query.clear()
  vi.resetAllMocks()
  vi.unstubAllGlobals()
})

it('should preserve a completed login when an older session validation is rejected', async () => {
  let stored: string | null = 'older-token'
  vi.mocked(Storage.getItem).mockImplementation(async () => stored)
  vi.mocked(Storage.setItem).mockImplementation(async (_key, token) => {
    stored = token
  })
  vi.mocked(Storage.removeItem).mockImplementation(async () => {
    stored = null
  })
  vi.mocked(TossAuth.login).mockResolvedValue({authorizationCode: 'code', referrer: 'DEFAULT'})
  const validation = Promise.withResolvers<Response>()
  const started = Promise.withResolvers<void>()
  vi.stubGlobal(
    'fetch',
    vi.fn<typeof fetch>().mockImplementation(async (_input, init) => {
      if (init?.method === 'PUT') {
        return Response.json({token: 'newer-token'})
      }
      if (init?.method !== 'PATCH') {
        started.resolve()
        return validation.promise
      }
      const token = new Headers(init.headers).get('Authorization')
      return new Response(null, {status: token === 'Bearer newer-token' ? 200 : 401})
    }),
  )

  const previous = tossSessionQuery()
  await started.promise
  await expect(createTossLoginSession()).resolves.toBe('newer-token')
  await expect(readStoredAppSession()).resolves.toBe('newer-token')
  validation.resolve(new Response(null, {status: 401}))
  await previous

  await expect(readStoredAppSession()).resolves.toBe('newer-token')
  expect(Storage.removeItem).toHaveBeenCalledTimes(1)
})
