import type {APIEvent} from '@solidjs/start/server'
import {mockEvent} from 'h3'
import {describe, expect, it} from 'vitest'

import {readBoundedRequest, readJsonBody} from '../body'

const createApiEvent = (request: Request): Pick<APIEvent, 'nativeEvent'> => ({
  nativeEvent: mockEvent(request),
})

const createJsonRequest = (body: string, headers: HeadersInit = {}): Request =>
  new Request('https://www.pomofi.io/api/test', {
    body,
    headers: {'Content-Type': 'application/json', ...headers},
    method: 'POST',
  })

describe('readJsonBody', () => {
  it('should read a valid JSON request through the H3 event', async () => {
    const request = createJsonRequest('{"ok":true}')
    const result = await readJsonBody(createApiEvent(request), 128)

    expect(result).toEqual({body: {ok: true}, success: true})
  })

  it('should reject malformed JSON', async () => {
    const request = createJsonRequest('{')
    const result = await readJsonBody(createApiEvent(request), 128)

    expect(result).toEqual({status: 400, success: false})
  })

  it('should reject a request without a JSON content type', async () => {
    const request = new Request('https://www.pomofi.io/api/test', {
      body: '{}',
      method: 'POST',
    })
    const result = await readJsonBody(createApiEvent(request), 128)

    expect(result).toEqual({status: 415, success: false})
  })

  it('should reject an unsupported content type', async () => {
    const request = new Request('https://www.pomofi.io/api/test', {
      body: '{}',
      headers: {'Content-Type': 'text/plain'},
      method: 'POST',
    })
    const result = await readJsonBody(createApiEvent(request), 128)

    expect(result).toEqual({status: 415, success: false})
  })

  it('should reject an honest oversized content length before reading', async () => {
    const request = createJsonRequest('{"value":"large"}', {'Content-Length': '17'})
    const result = await readJsonBody(createApiEvent(request), 4)

    expect(result).toEqual({status: 413, success: false})
  })

  it('should reject an oversized streamed body without a content length', async () => {
    const request = createJsonRequest(JSON.stringify({value: 'large'}))
    request.headers.delete('Content-Length')
    const result = await readJsonBody(createApiEvent(request), 4)

    expect(result).toEqual({status: 413, success: false})
  })
})

describe('readBoundedRequest', () => {
  it('should reconstruct the request without copying a runtime-specific Request object', async () => {
    const request = createJsonRequest('{"ok":true}', {
      'Content-Length': '11',
      'X-Request-Context': 'test',
    })
    const result = await readBoundedRequest(createApiEvent(request), 128)

    expect(result.success).toBe(true)

    if (!result.success) {
      return
    }

    expect(result.request).not.toBe(request)
    expect(result.request.url).toBe(request.url)
    expect(result.request.method).toBe('POST')
    expect(result.request.headers.get('Content-Length')).toBeNull()
    expect(result.request.headers.get('X-Request-Context')).toBe('test')
    await expect(result.request.json()).resolves.toEqual({ok: true})
  })
})
