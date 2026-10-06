/** @vitest-environment node */
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {httpFetch} from '../../../http-client'
import type {ModelStorage, ModelStorageError} from '../../../model-storage'
import {failureResult, successResult} from '../../../result'
import type {SupertonicProgress} from '../../messages'
import {createSupertonicResourceLoader} from '../resource-loader'

vi.mock('../../../http-client', () => ({httpFetch: vi.fn()}))
const url = 'https://models.example.com/weights.bin'
const signal = new AbortController().signal
const request = {fileName: 'weights.bin', signal, url}
let storage: ModelStorage
const progress = vi.fn<(progress: SupertonicProgress) => void>()

const createLoader = () => createSupertonicResourceLoader({onProgress: progress, storage})
const bufferRequest = {...request, expectedSize: 3, loadedBefore: 10, totalBytes: 13}

beforeEach(() => {
  vi.clearAllMocks()
  storage = {
    delete: vi.fn(),
    get: vi.fn().mockResolvedValue(successResult(null)),
    set: vi.fn().mockResolvedValue(successResult(undefined)),
  }
  progress.mockReset()
})
afterEach(() => vi.restoreAllMocks())

it('should read cached JSON without network access and preserve uncached manifests', async () => {
  vi.mocked(storage.get).mockResolvedValue(successResult(Response.json({source: 'cache'})))
  vi.mocked(httpFetch).mockResolvedValue(Response.json({source: 'network'}))
  const loader = createLoader()
  await expect(loader.loadJson(request)).resolves.toEqual(successResult({source: 'cache'}))
  expect(httpFetch).not.toHaveBeenCalled()
  await expect(loader.loadManifest(request)).resolves.toEqual(successResult({source: 'network'}))
  expect(storage.get).toHaveBeenCalledOnce()
  expect(storage.set).not.toHaveBeenCalled()
  expect(httpFetch).toHaveBeenCalledExactlyOnceWith(url, {cache: 'no-store', signal})
})

it('should retain binary chunk order and clamp only reported progress to expected size', async () => {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array([1, 2]))
      controller.enqueue(new Uint8Array([3, 4]))
      controller.close()
    },
  })
  vi.mocked(httpFetch).mockResolvedValue(new Response(body))
  const result = await createLoader().loadBuffer(bufferRequest)
  expect(result.ok).toBe(true)
  if (result.ok) {
    expect(new Uint8Array(result.value)).toEqual(new Uint8Array([1, 2, 3, 4]))
  }
  expect(progress.mock.calls).toEqual([
    [{fileName: 'weights.bin', loadedBytes: 12, totalBytes: 13}],
    [{fileName: 'weights.bin', loadedBytes: 13, totalBytes: 13}],
  ])
  expect(storage.set).toHaveBeenCalledOnce()
})

it('should use arrayBuffer for a bodyless cached response without reporting progress', async () => {
  const bytes = new Uint8Array([8, 9]).buffer
  const arrayBuffer = vi.fn().mockResolvedValue(bytes)
  vi.mocked(storage.get).mockResolvedValue(
    successResult({arrayBuffer, body: null, ok: true} as unknown as Response),
  )
  await expect(createLoader().loadBuffer(bufferRequest)).resolves.toEqual(successResult(bytes))
  expect(arrayBuffer).toHaveBeenCalledOnce()
  expect(progress).not.toHaveBeenCalled()
})

it.each(['loadBuffer', 'loadJson'] as const)(
  'should await soft cache-write failures before completing %s',
  async (method) => {
    const cacheWrite = Promise.withResolvers<
      ReturnType<typeof successResult<void>> | ReturnType<typeof failureResult<ModelStorageError>>
    >()
    vi.mocked(storage.set).mockReturnValue(cacheWrite.promise)
    vi.mocked(httpFetch).mockResolvedValue(Response.json({ready: true}))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    let completed = false
    const pending = createLoader()
      [method](bufferRequest)
      .then((result) => {
        completed = true
        return result
      })
    await vi.waitFor(() => expect(storage.set).toHaveBeenCalledOnce())
    expect(completed).toBe(false)
    const error: ModelStorageError = {cause: new Error('quota'), operation: 'write'}
    cacheWrite.resolve(failureResult(error))
    expect((await pending).ok).toBe(true)
    expect(warn).toHaveBeenCalledWith('Model cache write failed.', error.cause)
  },
)

it('should report cache read failure then use the network', async () => {
  const error: ModelStorageError = {cause: new Error('storage'), operation: 'read'}
  vi.mocked(storage.get).mockResolvedValue(failureResult(error))
  vi.mocked(httpFetch).mockResolvedValue(Response.json({ready: true}))
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  await expect(createLoader().loadJson(request)).resolves.toEqual(successResult({ready: true}))
  expect(warn).toHaveBeenCalledWith('Model cache read failed.', error.cause)
})

it.each(
  [400, 408, 429, 500].flatMap((status) =>
    (['loadBuffer', 'loadJson', 'loadManifest'] as const).map(
      (method) => [status, method] as const,
    ),
  ),
)('should preserve HTTP %s retryability in %s', async (status, method) => {
  vi.mocked(httpFetch).mockResolvedValue(new Response(null, {status}))
  await expect(createLoader()[method](bufferRequest)).resolves.toEqual(
    failureResult({
      code: 'download-failed',
      fileName: request.fileName,
      phase: 'download',
      retryable: status !== 400,
      status,
    }),
  )
})

it.each(['loadBuffer', 'loadJson', 'loadManifest'] as const)(
  'should preserve AbortError classification in %s',
  async (method) => {
    vi.mocked(httpFetch).mockRejectedValue(new DOMException('aborted', 'AbortError'))
    await expect(createLoader()[method](bufferRequest)).resolves.toEqual(
      failureResult({code: 'cancelled', phase: 'download', retryable: false}),
    )
  },
)

it.each(['loadBuffer', 'loadJson', 'loadManifest'] as const)(
  'should retain non-DOM abort-like errors as download failures in %s',
  async (method) => {
    const error = new Error('aborted')
    error.name = 'AbortError'
    vi.mocked(httpFetch).mockRejectedValue(error)
    await expect(createLoader()[method](bufferRequest)).resolves.toEqual(
      failureResult({
        code: 'download-failed',
        fileName: request.fileName,
        phase: 'download',
        retryable: true,
        status: null,
      }),
    )
  },
)

it('should map a streamed body failure and progress callback throw to download failures', async () => {
  vi.mocked(httpFetch).mockResolvedValue(
    new Response(
      new ReadableStream({
        start(controller) {
          controller.error(new Error('stream failed'))
        },
      }),
    ),
  )
  await expect(createLoader().loadBuffer(bufferRequest)).resolves.toMatchObject({
    error: {code: 'download-failed', status: null},
    ok: false,
  })
  vi.mocked(httpFetch).mockResolvedValue(new Response(new Uint8Array([1])))
  progress.mockImplementation(() => {
    throw new Error('observer')
  })
  await expect(createLoader().loadBuffer(bufferRequest)).resolves.toMatchObject({
    error: {code: 'download-failed', status: null},
    ok: false,
  })
})

it.each(['loadJson', 'loadManifest'] as const)(
  'should map malformed JSON to a retryable download failure in %s',
  async (method) => {
    vi.mocked(httpFetch).mockResolvedValue(new Response('invalid json'))
    await expect(createLoader()[method](request)).resolves.toMatchObject({
      error: {code: 'download-failed', retryable: true, status: null},
      ok: false,
    })
  },
)

it('should keep simultaneous binary and JSON loads independent', async () => {
  const first = Promise.withResolvers<Response>()
  const second = Promise.withResolvers<Response>()
  vi.mocked(httpFetch).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
  const loader = createLoader()
  const binary = loader.loadBuffer(bufferRequest)
  const json = loader.loadJson({...request, url: `${url}.json`})
  await vi.waitFor(() => expect(httpFetch).toHaveBeenCalledTimes(2))
  second.resolve(Response.json({second: true}))
  await expect(json).resolves.toEqual(successResult({second: true}))
  first.resolve(new Response(new Uint8Array([1])))
  expect((await binary).ok).toBe(true)
})
