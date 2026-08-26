import {z} from 'zod'
import {afterEach, expect, it, vi} from 'vitest'

import {apiJson, ApiJsonError, apiJsonRequest} from '..'

const resultSchema = z.object({value: z.string()})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('should return a validated successful response', () => {
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(Response.json({value: 'ok'})))

  return expect(apiJson('result', {responseSchema: resultSchema})).resolves.toEqual({value: 'ok'})
})

it('should serialize an object body and add the JSON content type', async () => {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(Response.json({value: 'created'}))
  vi.stubGlobal('fetch', fetchMock)

  await apiJson('result', {
    body: {name: 'Pomo'},
    method: 'POST',
    responseSchema: resultSchema,
  })

  expect(fetchMock).toHaveBeenCalledWith(
    '/api/result',
    expect.objectContaining({
      body: JSON.stringify({name: 'Pomo'}),
      method: 'POST',
    }),
  )
  const init = fetchMock.mock.calls[0]?.[1]
  expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json')
})

it('should preserve an explicit content type', async () => {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(Response.json({value: 'created'}))
  vi.stubGlobal('fetch', fetchMock)

  await apiJson('result', {
    body: {name: 'Pomo'},
    headers: {'Content-Type': 'application/merge-patch+json'},
    method: 'PATCH',
    responseSchema: resultSchema,
  })

  const init = fetchMock.mock.calls[0]?.[1]
  expect(new Headers(init?.headers).get('Content-Type')).toBe('application/merge-patch+json')
})

it('should distinguish a non-successful HTTP response', async () => {
  const response = Response.json({error: 'unavailable'}, {status: 503})
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(response))

  const error = await apiJson('result', {responseSchema: resultSchema}).catch(
    (cause: unknown) => cause,
  )

  expect(error).toBeInstanceOf(ApiJsonError)
  expect(error).toMatchObject({kind: 'http', response})
})

it('should preserve runtime exhaustiveness for an unknown error kind', () => {
  const response = new Response()
  const error = new ApiJsonError({kind: 'future' as never, response})

  expect(error.message).toBe('future')
  expect(error.kind).toBe('future')
})

it('should distinguish an invalid JSON response', () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('{', {headers: {'Content-Type': 'application/json'}})),
  )

  return expect(apiJson('result', {responseSchema: resultSchema})).rejects.toMatchObject({
    kind: 'parse',
  })
})

it('should distinguish a response schema mismatch', () => {
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(Response.json({value: 1})))

  return expect(apiJson('result', {responseSchema: resultSchema})).rejects.toMatchObject({
    kind: 'schema',
  })
})

it('should preserve the native cancellation error', async () => {
  const abortError = new DOMException('The operation was aborted.', 'AbortError')
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(abortError))

  await expect(
    apiJson('result', {responseSchema: resultSchema, signal: AbortSignal.abort()}),
  ).rejects.toBe(abortError)
})

it('should preserve cancellation while reading the response body', async () => {
  const abortError = new DOMException('The operation was aborted.', 'AbortError')
  const response = new Response(
    new ReadableStream({start: (controller) => controller.error(abortError)}),
  )
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(response))

  await expect(apiJson('result', {responseSchema: resultSchema})).rejects.toBe(abortError)
})

it('should preserve a custom cancellation reason while reading the response body', async () => {
  const timeoutError = new DOMException('The operation timed out.', 'TimeoutError')
  const signal = AbortSignal.abort(timeoutError)
  const response = new Response(
    new ReadableStream({start: (controller) => controller.error(timeoutError)}),
  )
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(response))

  await expect(apiJson('result', {responseSchema: resultSchema, signal})).rejects.toBe(timeoutError)
})

it('should classify an asynchronous schema mismatch', () => {
  const asynchronousSchema = resultSchema.refine(async () => false)
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(Response.json({value: 'ok'})))

  return expect(apiJson('result', {responseSchema: asynchronousSchema})).rejects.toMatchObject({
    kind: 'schema',
  })
})

it.each(['GET', 'HEAD'] as const)('should retry a transient %s response once', async (method) => {
  vi.useFakeTimers()
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(new Response(null, {status: 503}))
    .mockResolvedValueOnce(new Response(null, {status: 200}))
  vi.stubGlobal('fetch', fetchMock)

  const responsePromise = apiJsonRequest('result', {method})
  await vi.advanceTimersByTimeAsync(250)

  await expect(responsePromise).resolves.toMatchObject({status: 200})
  expect(fetchMock).toHaveBeenCalledTimes(2)
})

it.each(['POST', 'PUT', 'PATCH', 'DELETE'] as const)(
  'should not retry a transient %s response',
  async (method) => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({error: 'unavailable'}, {status: 503}))
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiJsonRequest('result', {body: {}, method})).resolves.toMatchObject({status: 503})
    expect(fetchMock).toHaveBeenCalledOnce()
  },
)
