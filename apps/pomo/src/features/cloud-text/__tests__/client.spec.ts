/** @vitest-environment node */
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import * as m from '@paraglide/message'
import {apiJsonRequest} from 'src/features/api-json'
import {requestCloudText} from '../client'
import type {CloudTextRequest} from '../contracts'
import {CLOUD_TEXT_RESPONSE} from './fixtures/response'

vi.mock('src/features/api-json', async (importOriginal) => ({
  ...(await importOriginal<typeof import('src/features/api-json')>()),
  apiJsonRequest: vi.fn(),
}))
vi.mock('src/features/user-auth/app-session', () => ({readStoredAppSession: vi.fn()}))

const request: CloudTextRequest = {
  maximumTokens: 100,
  messages: [{content: '질문', role: 'user'}],
  requestId: '00000000-0000-4000-8000-000000000001',
}
const completion = () =>
  new Response(`${JSON.stringify({...CLOUD_TEXT_RESPONSE, kind: 'complete'})}\n`)

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(apiJsonRequest).mockResolvedValueOnce(
    Response.json({requestId: request.requestId, usage: CLOUD_TEXT_RESPONSE.usage}, {status: 202}),
  )
})
afterEach(() => {
  vi.restoreAllMocks()
})

it('should reconnect the same accepted request after the response body disconnects', async () => {
  vi.mocked(apiJsonRequest)
    .mockResolvedValueOnce(
      new Response(
        new ReadableStream({start: (controller) => controller.error(new TypeError('terminated'))}),
      ),
    )
    .mockResolvedValueOnce(completion())
  expect(await requestCloudText(request, new AbortController().signal)).toEqual(CLOUD_TEXT_RESPONSE)
  expect(vi.mocked(apiJsonRequest).mock.calls.map(([url]) => url)).toEqual([
    'cloud-text',
    `cloud-text?requestId=${request.requestId}&events=true`,
    `cloud-text?requestId=${request.requestId}&events=true`,
  ])
})

it('should reconnect the same accepted request after notification fetch fails', async () => {
  vi.mocked(apiJsonRequest)
    .mockRejectedValueOnce(new TypeError('Failed to fetch'))
    .mockResolvedValueOnce(completion())
  expect(await requestCloudText(request, new AbortController().signal)).toEqual(CLOUD_TEXT_RESPONSE)
  expect(apiJsonRequest).toHaveBeenCalledTimes(3)
})

it('should settle abortion without waiting for the best-effort cancellation request', async () => {
  const controller = new AbortController()
  const cancellation = Promise.withResolvers<Response>()
  const cancellationStarted = Promise.withResolvers<void>()
  const logger = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  vi.mocked(apiJsonRequest)
    .mockImplementationOnce(async () => {
      controller.abort()
      controller.signal.throwIfAborted()
      throw new Error('Expected abortion')
    })
    .mockImplementationOnce(() => {
      cancellationStarted.resolve()
      return cancellation.promise
    })
  const aborted = requestCloudText(request, controller.signal).catch((error: unknown) => error)
  await cancellationStarted.promise
  const marker = Symbol('still pending')
  const outcome = await Promise.race([aborted, Promise.resolve(marker)])
  cancellation.resolve(Response.json({cancellationRequested: true}, {status: 202}))
  await aborted
  expect(outcome).not.toBe(marker)
  expect(outcome).toMatchObject({name: 'AbortError'})
  expect(logger).not.toHaveBeenCalled()
})

it.each(['failed', 'cancelled'] as const)(
  'should show the translated message for terminal %s without reconnecting',
  async (kind) => {
    vi.mocked(apiJsonRequest).mockResolvedValueOnce(
      new Response(
        `${JSON.stringify({kind, requestId: request.requestId, usage: CLOUD_TEXT_RESPONSE.usage})}\n`,
      ),
    )
    await expect(requestCloudText(request, new AbortController().signal)).rejects.toThrow(
      m.cloud_text_failed(),
    )
    expect(apiJsonRequest).toHaveBeenCalledTimes(2)
  },
)

it('should not reconnect an invalid notification contract', async () => {
  vi.mocked(apiJsonRequest).mockResolvedValueOnce(new Response('{"kind":"unexpected"}\n'))
  await expect(requestCloudText(request, new AbortController().signal)).rejects.toThrow()
  expect(apiJsonRequest).toHaveBeenCalledTimes(2)
})

it('should stop reconnecting after five transport failures without posting another generation', async () => {
  vi.mocked(apiJsonRequest).mockRejectedValue(new TypeError('Failed to fetch'))
  await expect(requestCloudText(request, new AbortController().signal)).rejects.toThrow()
  expect(apiJsonRequest).toHaveBeenCalledTimes(6)
  expect(
    vi.mocked(apiJsonRequest).mock.calls.filter(([, options]) => options.method === 'POST'),
  ).toHaveLength(1)
})

it('should not reconnect a notification rejected by authentication', async () => {
  vi.mocked(apiJsonRequest).mockResolvedValueOnce(
    Response.json({error: 'unauthorized'}, {status: 401}),
  )
  await expect(requestCloudText(request, new AbortController().signal)).rejects.toThrow()
  expect(apiJsonRequest).toHaveBeenCalledTimes(2)
})

it('should stop notification reconnection when the request is aborted', async () => {
  const controller = new AbortController()
  vi.mocked(apiJsonRequest)
    .mockImplementationOnce(async () => {
      controller.abort()
      throw controller.signal.reason
    })
    .mockResolvedValueOnce(Response.json({cancellationRequested: true}, {status: 202}))
  await expect(requestCloudText(request, controller.signal)).rejects.toMatchObject({
    name: 'AbortError',
  })
  // Cancellation may proceed independently, but notification acquisition must stop.
  expect(
    vi.mocked(apiJsonRequest).mock.calls.filter(([url]) => String(url).endsWith('events=true')),
  ).toHaveLength(1)
})
