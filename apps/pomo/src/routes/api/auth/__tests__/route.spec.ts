import {beforeEach, describe, expect, it, vi} from 'vitest'

const proxyMocks = vi.hoisted(() => ({handlePomoAuthProxy: vi.fn()}))

vi.mock('src/server/auth/proxy', () => proxyMocks)

import {GET, POST} from '../[...path]'
import {invokeApiRoute} from '../../__tests__/invoke'

describe('Neon Auth proxy route', () => {
  beforeEach(() => {
    proxyMocks.handlePomoAuthProxy.mockReset().mockResolvedValue(Response.json({proxied: true}))
  })

  it('should proxy GET requests with their catch-all path', async () => {
    const request = new Request('https://www.pomofi.io/api/auth/session')

    const response = await invokeApiRoute(GET, request, {path: 'session'})

    expect(response.status).toBe(200)
    expect(proxyMocks.handlePomoAuthProxy).toHaveBeenCalledWith({
      params: {path: 'session'},
      request: expect.any(Request),
    })
  })

  it('should proxy bounded POST requests with an empty fallback path', async () => {
    const request = new Request('https://www.pomofi.io/api/auth', {
      body: JSON.stringify({email: 'user@example.com'}),
      headers: {'Content-Type': 'application/json'},
      method: 'POST',
    })

    const response = await invokeApiRoute(POST, request)

    expect(response.status).toBe(200)
    expect(proxyMocks.handlePomoAuthProxy).toHaveBeenCalledWith({
      params: {path: ''},
      request: expect.any(Request),
    })
  })

  it('should reject an oversized streamed body before calling Neon Auth', async () => {
    const request = new Request('https://www.pomofi.io/api/auth/sign-in/magic-link', {
      body: 'x'.repeat(20_000),
      headers: {'Content-Type': 'application/json'},
      method: 'POST',
    })
    request.headers.delete('Content-Length')
    const response = await invokeApiRoute(POST, request, {path: 'sign-in/magic-link'})

    expect(response.status).toBe(413)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(proxyMocks.handlePomoAuthProxy).not.toHaveBeenCalled()
  })
})
