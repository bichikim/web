import {EventEmitter} from 'node:events'

import {beforeEach, describe, expect, it, vi} from 'vitest'

const dependencyMocks = vi.hoisted(() => ({
  getTossMtlsCredentials: vi.fn(),
  httpsRequest: vi.fn(),
}))

vi.mock('node:https', async () => {
  const actual = await vi.importActual<typeof import('node:https')>('node:https')

  return {
    ...actual,
    default: {...actual, request: dependencyMocks.httpsRequest},
    request: dependencyMocks.httpsRequest,
  }
})
vi.mock('../environment', () => ({
  getTossMtlsCredentials: dependencyMocks.getTossMtlsCredentials,
}))

import {exchangeTossAuthorization} from '../client'

class MockResponse extends EventEmitter {
  public readonly destroy = vi.fn((error?: Error) => {
    if (error !== undefined) {
      this.emit('error', error)
    }
  })

  public constructor(public readonly statusCode?: number) {
    super()
  }
}

class MockRequest extends EventEmitter {
  public readonly destroy = vi.fn((error?: Error) => {
    if (error !== undefined) {
      this.emit('error', error)
    }
  })

  public readonly end = vi.fn()
  public timeoutHandler: (() => void) | undefined
  public readonly setTimeout = vi.fn((_timeout: number, handler: () => void) => {
    this.timeoutHandler = handler
  })

  public readonly write = vi.fn()
}

interface HttpResponseFixture {
  readonly body?: string | Buffer
  readonly status?: number
}

const queueHttpResponses = (fixtures: ReadonlyArray<HttpResponseFixture>) => {
  const requests: Array<{options: Record<string, unknown>; request: MockRequest; url: URL}> = []
  let responseIndex = 0

  dependencyMocks.httpsRequest.mockImplementation(
    (url: URL, options: Record<string, unknown>, onResponse: (response: MockResponse) => void) => {
      const fixture = fixtures[responseIndex]
      responseIndex += 1
      const response = new MockResponse(fixture?.status)
      const request = new MockRequest()
      onResponse(response)
      request.end.mockImplementation(() => {
        queueMicrotask(() => {
          if (fixture?.body !== undefined) {
            response.emit(
              'data',
              Buffer.isBuffer(fixture.body) ? fixture.body : Buffer.from(fixture.body),
            )
          }
          response.emit('end')
        })
      })
      requests.push({options, request, url})
      return request
    },
  )

  return requests
}

beforeEach(() => {
  vi.clearAllMocks()
  dependencyMocks.httpsRequest.mockReset()
  dependencyMocks.getTossMtlsCredentials.mockReturnValue({
    certificate: 'certificate',
    privateKey: 'private-key',
  })
})

describe('exchangeTossAuthorization', () => {
  it('should exchange an authorization code and return the app-scoped user key', async () => {
    const requester = vi
      .fn()
      .mockResolvedValueOnce({
        body: {resultType: 'SUCCESS', success: {accessToken: 'toss-access'}},
        status: 200,
      })
      .mockResolvedValueOnce({
        body: {resultType: 'SUCCESS', success: {userKey: 443_731_104}},
        status: 200,
      })

    await expect(
      exchangeTossAuthorization(
        {authorizationCode: 'one-time-code', referrer: 'SANDBOX'},
        requester,
      ),
    ).resolves.toEqual({userKey: '443731104'})
    expect(requester).toHaveBeenNthCalledWith(1, {
      body: {authorizationCode: 'one-time-code', referrer: 'SANDBOX'},
      method: 'POST',
      path: '/api-partner/v1/apps-in-toss/user/oauth2/generate-token',
    })
    expect(requester).toHaveBeenNthCalledWith(2, {
      accessToken: 'toss-access',
      method: 'GET',
      path: '/api-partner/v1/apps-in-toss/user/oauth2/login-me',
    })
  })

  it('should reject unsuccessful Toss responses before reading user information', async () => {
    const requester = vi.fn().mockResolvedValue({body: {resultType: 'FAIL'}, status: 401})

    await expect(
      exchangeTossAuthorization(
        {authorizationCode: 'expired-code', referrer: 'DEFAULT'},
        requester,
      ),
    ).rejects.toThrow('status 401')
    expect(requester).toHaveBeenCalledTimes(1)
  })

  it('should reject malformed successful responses', async () => {
    const requester = vi.fn().mockResolvedValue({body: {resultType: 'SUCCESS'}, status: 200})

    await expect(
      exchangeTossAuthorization(
        {authorizationCode: 'one-time-code', referrer: 'DEFAULT'},
        requester,
      ),
    ).rejects.toBeDefined()
  })

  it('should accept a nonempty string user key', async () => {
    const requester = vi
      .fn()
      .mockResolvedValueOnce({
        body: {resultType: 'SUCCESS', success: {accessToken: 'toss-access'}},
        status: 200,
      })
      .mockResolvedValueOnce({
        body: {resultType: 'SUCCESS', success: {userKey: 'user-key'}},
        status: 200,
      })

    await expect(
      exchangeTossAuthorization(
        {authorizationCode: 'one-time-code', referrer: 'DEFAULT'},
        requester,
      ),
    ).resolves.toEqual({userKey: 'user-key'})
  })

  it('should reject a response below the successful status range', async () => {
    const requester = vi.fn().mockResolvedValue({body: null, status: 199})

    await expect(
      exchangeTossAuthorization(
        {authorizationCode: 'one-time-code', referrer: 'DEFAULT'},
        requester,
      ),
    ).rejects.toThrow('status 199')
  })
})

describe('mTLS Toss requester', () => {
  it('should exchange credentials over POST and authenticated GET requests', async () => {
    const requests = queueHttpResponses([
      {
        body: JSON.stringify({
          resultType: 'SUCCESS',
          success: {accessToken: 'toss-access'},
        }),
        status: 200,
      },
      {
        body: JSON.stringify({resultType: 'SUCCESS', success: {userKey: 123}}),
        status: 200,
      },
    ])

    await expect(
      exchangeTossAuthorization({authorizationCode: 'one-time-code', referrer: 'SANDBOX'}),
    ).resolves.toEqual({userKey: '123'})

    expect(dependencyMocks.getTossMtlsCredentials).toHaveBeenCalledOnce()
    expect(requests).toHaveLength(2)
    expect(requests[0]?.url.href).toBe(
      'https://apps-in-toss-api.toss.im/api-partner/v1/apps-in-toss/user/oauth2/generate-token',
    )
    expect(requests[0]?.options).toMatchObject({
      cert: 'certificate',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      key: 'private-key',
      method: 'POST',
      rejectUnauthorized: true,
    })
    expect(requests[0]?.request.write).toHaveBeenCalledWith(
      JSON.stringify({authorizationCode: 'one-time-code', referrer: 'SANDBOX'}),
    )
    expect(requests[1]?.options).toMatchObject({
      headers: {Accept: 'application/json', Authorization: 'Bearer toss-access'},
      method: 'GET',
    })
    expect(requests[1]?.request.write).not.toHaveBeenCalled()
    expect(requests.every(({request}) => request.end.mock.calls.length === 1)).toBe(true)
  })

  it('should reject invalid JSON from Toss', async () => {
    let response: MockResponse | undefined
    let request: MockRequest | undefined
    dependencyMocks.httpsRequest.mockImplementation(
      (_url: URL, _options: unknown, onResponse: (value: MockResponse) => void) => {
        response = new MockResponse(200)
        request = new MockRequest()
        onResponse(response)
        return request
      },
    )
    const exchange = exchangeTossAuthorization({
      authorizationCode: 'one-time-code',
      referrer: 'DEFAULT',
    })

    response?.emit('data', Buffer.from('not-json'))
    expect(() => response?.emit('end')).toThrow('Toss returned an invalid JSON response')
    request?.emit('error', new Error('request cleanup'))

    await expect(exchange).rejects.toThrow('request cleanup')
  })

  it('should reject an empty successful response body', async () => {
    queueHttpResponses([{status: 200}])

    await expect(
      exchangeTossAuthorization({authorizationCode: 'one-time-code', referrer: 'DEFAULT'}),
    ).rejects.toBeDefined()
  })

  it('should use bad gateway when Toss omits the response status', async () => {
    queueHttpResponses([{body: '{}'}])

    await expect(
      exchangeTossAuthorization({authorizationCode: 'one-time-code', referrer: 'DEFAULT'}),
    ).rejects.toThrow('status 502')
  })

  it('should reject a response beyond the size limit', async () => {
    const requests = queueHttpResponses([{body: Buffer.alloc(1_048_577), status: 200}])

    await expect(
      exchangeTossAuthorization({authorizationCode: 'one-time-code', referrer: 'DEFAULT'}),
    ).rejects.toThrow('Toss response exceeded the size limit')
    expect(requests).toHaveLength(1)
  })

  it('should reject a response stream error', async () => {
    dependencyMocks.httpsRequest.mockImplementation(
      (_url: URL, _options: unknown, onResponse: (response: MockResponse) => void) => {
        const response = new MockResponse(200)
        const request = new MockRequest()
        onResponse(response)
        request.end.mockImplementation(() => {
          queueMicrotask(() => response.emit('error', new Error('response failed')))
        })
        return request
      },
    )

    await expect(
      exchangeTossAuthorization({authorizationCode: 'one-time-code', referrer: 'DEFAULT'}),
    ).rejects.toThrow('response failed')
  })

  it('should reject an outgoing request error', async () => {
    dependencyMocks.httpsRequest.mockImplementation(
      (_url: URL, _options: unknown, _onResponse: (response: MockResponse) => void) => {
        const request = new MockRequest()
        request.end.mockImplementation(() => {
          queueMicrotask(() => request.emit('error', new Error('request failed')))
        })
        return request
      },
    )

    await expect(
      exchangeTossAuthorization({authorizationCode: 'one-time-code', referrer: 'DEFAULT'}),
    ).rejects.toThrow('request failed')
  })

  it('should destroy a request after the timeout', async () => {
    let outgoingRequest: MockRequest | undefined
    dependencyMocks.httpsRequest.mockImplementation(
      (_url: URL, _options: unknown, _onResponse: (response: MockResponse) => void) => {
        outgoingRequest = new MockRequest()
        return outgoingRequest
      },
    )
    const exchange = exchangeTossAuthorization({
      authorizationCode: 'one-time-code',
      referrer: 'DEFAULT',
    })

    outgoingRequest?.timeoutHandler?.()

    await expect(exchange).rejects.toThrow('Toss request timed out')
    expect(outgoingRequest?.setTimeout).toHaveBeenCalledWith(8000, expect.any(Function))
  })
})
