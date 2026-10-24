/** @vitest-environment node */
import {expect, it, vi} from 'vitest'

vi.mock('src/env', () => {
  throw new Error('Prerender must not load server credentials')
})
vi.mock('@paraglide/server', () => ({paraglideMiddleware: vi.fn()}))
vi.mock('@solidjs/start/middleware', () => ({createMiddleware: vi.fn((value) => value)}))
vi.mock('../security-header-policy', () => ({
  BASE_SECURITY_HEADERS: {},
  createContentSecurityPolicy: vi.fn(() => ''),
  WORKER_SECURITY_HEADERS: {},
}))

it('should load prerender middleware without server credentials', async () => {
  const {default: middleware} = await import('../prerender')
  const {securityHeadersMiddleware} = await import('../security-headers')
  const {corsMiddleware} = await import('../cors')

  expect(middleware).toEqual([securityHeadersMiddleware, corsMiddleware, expect.any(Function)])
})
