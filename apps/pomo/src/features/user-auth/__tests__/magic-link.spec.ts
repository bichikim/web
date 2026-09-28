/** @vitest-environment node */
import {beforeEach, expect, it, vi} from 'vitest'

const apiMocks = vi.hoisted(() => ({apiJsonRequest: vi.fn()}))

vi.mock('../../api-json', () => apiMocks)

import {requestUserMagicLink} from '../magic-link'

beforeEach(() => {
  vi.clearAllMocks()
  apiMocks.apiJsonRequest.mockResolvedValue(new Response(null, {status: 200}))
})

it('should keep an internal payment return path in both magic-link callbacks', async () => {
  await expect(
    requestUserMagicLink({
      email: 'user@example.com',
      origin: 'https://pomo.example',
      returnTo: '/payments/return?order_id=order-1',
    }),
  ).resolves.toBe(true)

  const request = apiMocks.apiJsonRequest.mock.calls[0]?.[1]
  expect(request.body.callbackURL).toBe(
    'https://pomo.example/account?returnTo=%2Fpayments%2Freturn%3Forder_id%3Dorder-1',
  )
  expect(request.body.errorCallbackURL).toBe(request.body.callbackURL)
})

it('should discard external return paths before building the callback URL', async () => {
  await requestUserMagicLink({
    email: 'user@example.com',
    origin: 'https://pomo.example',
    returnTo: 'https://attacker.example',
  })

  expect(apiMocks.apiJsonRequest.mock.calls[0]?.[1].body.callbackURL).toBe(
    'https://pomo.example/account',
  )
})
