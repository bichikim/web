import {afterEach, expect, it, vi} from 'vitest'

import {requestAdminMagicLink} from '../magic-link.ts'

afterEach(() => {
  vi.unstubAllGlobals()
})

it('should request a magic link that returns to the admin page', async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(null, {status: 200}))
  vi.stubGlobal('fetch', fetchMock)

  await expect(
    requestAdminMagicLink({email: 'admin@example.com', origin: 'https://pomo.example'}),
  ).resolves.toBe(true)
  expect(fetchMock).toHaveBeenCalledWith(
    '/api/auth/sign-in/magic-link',
    expect.objectContaining({
      body: JSON.stringify({
        callbackURL: 'https://pomo.example/admin',
        email: 'admin@example.com',
        errorCallbackURL: 'https://pomo.example/admin/login',
      }),
      credentials: 'include',
      method: 'POST',
    }),
  )
})

it('should report an unsuccessful magic-link response', () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, {status: 400})))

  return expect(
    requestAdminMagicLink({email: 'admin@example.com', origin: 'https://pomo.example'}),
  ).resolves.toBe(false)
})
