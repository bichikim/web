import {afterEach, expect, it, vi} from 'vitest'

import {signOutAdminSession} from '../session'

afterEach(() => {
  vi.unstubAllGlobals()
})

it('should report a successful server-side session revocation', async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response(null, {status: 200}))
  vi.stubGlobal('fetch', fetchMock)

  await expect(signOutAdminSession({origin: 'https://pomo.example'})).resolves.toBe(true)
  expect(fetchMock).toHaveBeenCalledWith(
    new URL('https://pomo.example/api/auth/sign-out'),
    expect.objectContaining({credentials: 'include', method: 'POST'}),
  )
})

it('should keep the admin signed in when server-side revocation fails', () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, {status: 503})))

  return expect(signOutAdminSession({origin: 'https://pomo.example'})).resolves.toBe(false)
})
