import type {FetchEvent} from '@solidjs/start/server'
import {describe, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({json: vi.fn()}))

vi.mock('@solidjs/router', () => ({json: mocks.json}))

import {TRUSTED_ORIGINS} from '../consts'
import {corsMiddleware} from '../cors'

const createEvent = (request: Request): FetchEvent => ({
  locals: {},
  nativeEvent: {} as FetchEvent['nativeEvent'],
  request,
  response: {headers: new Headers()},
})

const runMiddleware = (event: FetchEvent) => {
  const middleware = corsMiddleware.onBeforeResponse

  if (typeof middleware !== 'function') {
    throw new TypeError('Expected one CORS response middleware')
  }

  return middleware(event, {})
}

describe('corsMiddleware', () => {
  it('should allow a trusted origin for API requests', () => {
    const origin = TRUSTED_ORIGINS[0]
    const event = createEvent(
      new Request('https://coong.example/api/music', {headers: {Origin: origin}}),
    )

    expect(runMiddleware(event)).toBeUndefined()
    expect(event.response.headers.get('Access-Control-Allow-Origin')).toBe(origin)
    expect(event.response.headers.get('Vary')).toContain('Origin')
  })

  it('should return a standalone response for trusted preflight requests', async () => {
    mocks.json.mockImplementation((data: unknown, init?: ResponseInit) => Response.json(data, init))
    const origin = TRUSTED_ORIGINS[0]
    const event = createEvent(
      new Request('https://coong.example/api/music', {
        headers: {'Access-Control-Request-Method': 'POST', Origin: origin},
        method: 'OPTIONS',
      }),
    )

    const response = await runMiddleware(event)

    expect(response).toBeInstanceOf(Response)
    expect(response?.headers.get('Access-Control-Allow-Origin')).toBe(origin)
    expect(response?.headers.get('Access-Control-Allow-Methods')).toContain('POST')
  })

  it('should not allow untrusted or non-API requests', () => {
    const untrusted = createEvent(
      new Request('https://coong.example/api/music', {headers: {Origin: 'https://evil.example'}}),
    )
    const nonApi = createEvent(
      new Request('https://coong.example/music', {headers: {Origin: TRUSTED_ORIGINS[0]}}),
    )

    runMiddleware(untrusted)
    runMiddleware(nonApi)

    expect(untrusted.response.headers.has('Access-Control-Allow-Origin')).toBe(false)
    expect(nonApi.response.headers.has('Access-Control-Allow-Origin')).toBe(false)
  })
})
