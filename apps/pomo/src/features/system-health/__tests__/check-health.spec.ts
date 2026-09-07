import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

const httpMocks = vi.hoisted(() => ({apiFetch: vi.fn()}))
const serverMocks = vi.hoisted(() => ({checkServerHealth: vi.fn()}))

vi.mock('src/features/http-client', () => httpMocks)
vi.mock('src/server/functions/health', () => serverMocks)

import {checkSystemHealth} from '../check-health'

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('checkSystemHealth', () => {
  it('should report both remote paths as healthy after validating their responses', async () => {
    httpMocks.apiFetch.mockResolvedValue(Response.json({status: 'ok'}))
    serverMocks.checkServerHealth.mockResolvedValue({status: 'ok'})

    await expect(checkSystemHealth()).resolves.toEqual({
      api: 'healthy',
      serverFunction: 'healthy',
    })
    expect(httpMocks.apiFetch).toHaveBeenCalledWith('health', {
      cache: 'no-store',
      method: 'GET',
      signal: expect.any(AbortSignal),
    })
    expect(serverMocks.checkServerHealth).toHaveBeenCalledOnce()
  })

  it('should report an invalid API response without hiding a healthy server function', async () => {
    httpMocks.apiFetch.mockResolvedValue(Response.json({status: 'unexpected'}))
    serverMocks.checkServerHealth.mockResolvedValue({status: 'ok'})

    await expect(checkSystemHealth()).resolves.toEqual({
      api: 'unhealthy',
      serverFunction: 'healthy',
    })
  })

  it('should report an unsuccessful API status without reading its response body', async () => {
    const response = new Response(null, {status: 503})
    const json = vi.spyOn(response, 'json')
    httpMocks.apiFetch.mockResolvedValue(response)
    serverMocks.checkServerHealth.mockResolvedValue({status: 'ok'})

    await expect(checkSystemHealth()).resolves.toEqual({
      api: 'unhealthy',
      serverFunction: 'healthy',
    })
    expect(json).not.toHaveBeenCalled()
  })

  it('should report independent request failures without rejecting the whole check', async () => {
    httpMocks.apiFetch.mockRejectedValue(new TypeError('offline'))
    serverMocks.checkServerHealth.mockRejectedValue(new Error('server unavailable'))

    await expect(checkSystemHealth()).resolves.toEqual({
      api: 'unhealthy',
      serverFunction: 'unhealthy',
    })
  })

  it('should finish with a failure when a request never settles', async () => {
    vi.useFakeTimers()
    httpMocks.apiFetch.mockResolvedValue(Response.json({status: 'ok'}))
    serverMocks.checkServerHealth.mockReturnValue(
      new Promise(() => {
        // The unresolved promise models a connection that never responds.
      }),
    )

    const result = checkSystemHealth()
    await vi.advanceTimersByTimeAsync(10_000)

    await expect(result).resolves.toEqual({
      api: 'healthy',
      serverFunction: 'unhealthy',
    })
  })
})
