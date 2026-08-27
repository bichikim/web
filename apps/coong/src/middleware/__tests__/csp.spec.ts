import type {FetchEvent} from '@solidjs/start/server'
import {describe, expect, it, vi} from 'vitest'

vi.mock('src/env', () => ({getSupabaseClientKeys: vi.fn()}))

import {getSupabaseClientKeys} from 'src/env'

vi.mocked(getSupabaseClientKeys).mockReturnValue({key: 'test-key', url: 'https://db.example/path'})

const createEvent = (): FetchEvent => ({
  locals: {},
  nativeEvent: {} as FetchEvent['nativeEvent'],
  request: new Request('https://coong.example'),
  response: {headers: new Headers()},
})

describe('cspMiddleware', () => {
  it('should assign a nonce and content security policy', async () => {
    const {cspMiddleware} = await import('../csp')
    const middleware = cspMiddleware.onRequest
    const event = createEvent()

    if (typeof middleware !== 'function') {
      throw new TypeError('Expected one CSP request middleware')
    }

    await middleware(event)

    expect(event.locals.nonce).toEqual(expect.any(String))
    expect(event.response.headers.get('Content-Security-Policy')).toContain(
      `script-src 'nonce-${event.locals.nonce}'`,
    )
    expect(event.response.headers.get('Content-Security-Policy')).toContain('https://db.example')
  })
})
