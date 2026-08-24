import {afterEach, expect, it, vi} from 'vitest'

import {apiFetch, httpFetch} from '..'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

it('should retry a transient GET failure once and preserve the response body', async () => {
  vi.useFakeTimers()
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(new Response(null, {status: 503}))
    .mockResolvedValueOnce(Response.json({ok: true}))
  vi.stubGlobal('fetch', fetchMock)

  const responsePromise = httpFetch('https://pomo.example/resource')
  await vi.advanceTimersByTimeAsync(250)
  const response = await responsePromise

  expect(fetchMock).toHaveBeenCalledTimes(2)
  await expect(response.json()).resolves.toEqual({ok: true})
})

it('should not retry a payload request without an idempotency contract', async () => {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, {status: 503}))
  vi.stubGlobal('fetch', fetchMock)

  const response = await httpFetch('https://pomo.example/resource', {method: 'POST'})

  expect(response.status).toBe(503)
  expect(fetchMock).toHaveBeenCalledOnce()
})

it('should preserve the native abort error contract', async () => {
  const abortError = new DOMException('The operation was aborted.', 'AbortError')
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(abortError))

  await expect(httpFetch('https://pomo.example/resource')).rejects.toBe(abortError)
})

it('should use the same-origin API base URL for the web build', async () => {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, {status: 200}))
  vi.stubGlobal('fetch', fetchMock)

  await apiFetch('account')

  expect(fetchMock).toHaveBeenCalledWith('/api/account', expect.any(Object))
})

it('should use the public API origin for the Apps in Toss build', async () => {
  vi.stubEnv('POMO_IS_APPS_IN_TOSS', '1')
  vi.stubEnv('POMO_PUBLIC_ORIGIN', 'https://pomo.example')
  vi.resetModules()
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, {status: 200}))
  vi.stubGlobal('fetch', fetchMock)
  const {apiFetch: appsInTossApiFetch} = await import('..')

  await appsInTossApiFetch('account')

  expect(fetchMock).toHaveBeenCalledWith('https://pomo.example/api/account', expect.any(Object))
})
