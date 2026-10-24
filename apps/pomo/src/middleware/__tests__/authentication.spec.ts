/** @vitest-environment node */
import {beforeEach, expect, it, vi} from 'vitest'
import {H3} from 'h3'

import {authenticationMiddleware} from '../authentication'

const mocks = vi.hoisted(() => ({
  getRequestEvent: vi.fn(),
}))
vi.mock('solid-js/web', () => ({getRequestEvent: mocks.getRequestEvent}))

beforeEach(() => vi.resetAllMocks())

it('should provide empty request-scoped authentication state', async () => {
  const locals = {}
  mocks.getRequestEvent.mockReturnValue({locals})
  const app = new H3().use(authenticationMiddleware).get('/public', () => 'public')
  const response = await app.fetch(new Request('https://pomo.example/public'))
  expect(await response.text()).toBe('public')
  expect(locals).toEqual({authentication: {request: expect.any(Request)}})
})
