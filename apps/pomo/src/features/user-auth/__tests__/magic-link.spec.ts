import {afterEach, expect, it, vi} from 'vitest'

import {requestUserMagicLink} from '../magic-link'

afterEach(() => {
  vi.unstubAllGlobals()
})

it('should serialize a user magic-link request and preserve a successful status', async () => {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, {status: 200}))
  vi.stubGlobal('fetch', fetchMock)

  await expect(
    requestUserMagicLink({email: 'user@example.com', origin: 'https://pomo.example'}),
  ).resolves.toBe(true)
  expect(fetchMock).toHaveBeenCalledWith(
    '/api/auth/sign-in/magic-link',
    expect.objectContaining({
      body: JSON.stringify({
        callbackURL: 'https://pomo.example/account',
        email: 'user@example.com',
        errorCallbackURL: 'https://pomo.example/account',
      }),
      credentials: 'include',
      method: 'POST',
    }),
  )
})

it('should preserve an unsuccessful user magic-link status', () => {
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response(null, {status: 400})))

  return expect(
    requestUserMagicLink({email: 'user@example.com', origin: 'https://pomo.example'}),
  ).resolves.toBe(false)
})
