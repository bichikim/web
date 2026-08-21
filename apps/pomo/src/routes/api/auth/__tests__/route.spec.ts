import {beforeEach, describe, expect, it, vi} from 'vitest'

const proxyMocks = vi.hoisted(() => ({handlePomoAuthProxy: vi.fn()}))

vi.mock('src/server/auth/proxy', () => proxyMocks)

import {POST} from '../[...path]'
import {invokeApiRoute} from '../../__tests__/invoke'

describe('Neon Auth proxy route', () => {
  beforeEach(() => {
    proxyMocks.handlePomoAuthProxy.mockReset()
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
