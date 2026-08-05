import {describe, expect, it, vi} from 'vitest'
import type {FetchEvent} from '@solidjs/start/server'
import {csrfMiddleware} from '../csrf'

vi.mock('@solidjs/router', () => ({
  json: (data: unknown, init?: ResponseInit) => Response.json(data, init),
}))

const createFetchEvent = (request: Request): FetchEvent => ({
  locals: {},
  nativeEvent: {} as FetchEvent['nativeEvent'],
  request,
  response: {
    headers: new Headers(),
  },
})

const runCsrfMiddleware = async (request: Request) => {
  const onRequest = csrfMiddleware.onRequest
  const event = createFetchEvent(request)

  if (typeof onRequest === 'function') {
    return onRequest(event)
  }

  if (Array.isArray(onRequest)) {
    return onRequest[0]?.(event)
  }
}

describe('csrfMiddleware', () => {
  it('should allow https unsafe requests with same-origin referer', async () => {
    const request = new Request('https://coong.example/api/profile', {
      headers: {
        Referer: 'https://coong.example/settings',
      },
      method: 'POST',
    })

    const response = await runCsrfMiddleware(request)

    expect(response).toBeUndefined()
  })

  it('should reject https unsafe requests with cross-origin referer', async () => {
    const request = new Request('https://coong.example/api/profile', {
      headers: {
        Referer: 'https://evil.example/settings',
      },
      method: 'POST',
    })

    const response = await runCsrfMiddleware(request)

    expect(response?.status).toBe(403)
  })

  it.each([
    {header: 'Origin', value: 'null'},
    {header: 'Origin', value: 'not-a-url'},
    {header: 'Referer', value: 'not-a-url'},
  ])('should reject a malformed $header header', async ({header, value}) => {
    const request = new Request('https://coong.example/api/profile', {
      headers: {[header]: value},
      method: 'POST',
    })

    const response = await runCsrfMiddleware(request)

    expect(response?.status).toBe(403)
  })
})
