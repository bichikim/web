import {afterEach, describe, expect, it, vi} from 'vitest'

const httpMocks = vi.hoisted(() => ({fetch: vi.fn()}))

vi.mock('../../http-client', () => ({httpFetch: httpMocks.fetch}))

import {createResumableModelFetch, type PartialDownloadStorage} from '../resumable-fetch'
import {createPartialStorage} from './support/partial-storage'

type PartialMetadata = Parameters<PartialDownloadStorage['reset']>[0]

const createMetadata = (
  url = 'https://models.test/model.onnx',
  overrides: Partial<PartialMetadata> = {},
): PartialMetadata => ({
  contentType: 'application/octet-stream',
  etag: 'model-v1',
  lastModified: null,
  totalBytes: 8,
  url,
  ...overrides,
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const createHeaders = (length: number) => ({
  'accept-ranges': 'bytes',
  'content-length': length.toString(),
  'content-type': 'application/octet-stream',
  etag: 'model-v1',
})

describe('createResumableModelFetch recovery', () => {
  it('should continue without persistence when storage initialization fails', async () => {
    const partial = createPartialStorage()
    vi.mocked(partial.storage.reset).mockRejectedValue(new Error('reset failed'))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const response = new Response('complete', {headers: createHeaders(8)})
    const resumable = createResumableModelFetch({
      fetcher: vi.fn(async () => response),
      partialStorage: partial.storage,
    })

    expect(await resumable.fetch('https://models.test/model.onnx')).toBe(response)
    expect(warn).toHaveBeenCalledWith(
      'Partial model download could not be initialized.',
      expect.any(Error),
    )
  })

  it('should ignore partial read failures and start a fresh download', async () => {
    const partial = createPartialStorage()
    vi.mocked(partial.storage.get).mockRejectedValue(new Error('read failed'))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const resumable = createResumableModelFetch({
      fetcher: vi.fn(async () => new Response('complete', {headers: createHeaders(8)})),
      partialStorage: partial.storage,
    })

    expect(await (await resumable.fetch('https://models.test/model.onnx')).text()).toBe('complete')
    expect(warn).toHaveBeenCalledWith(
      'Partial model download could not be read.',
      expect.any(Error),
    )
  })

  it('should warn and continue when persisted chunk writes fail', async () => {
    const partial = createPartialStorage()
    vi.mocked(partial.storage.append).mockRejectedValue(new Error('append failed'))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const chunk = new Uint8Array(8 * 1024 * 1024)
    let pullCount = 0
    const response = new Response(
      new ReadableStream({
        pull(controller) {
          if (pullCount < 2) {
            controller.enqueue(chunk)
            pullCount += 1
            return
          }
          controller.close()
        },
      }),
      {headers: createHeaders(chunk.byteLength * 2)},
    )
    const resumable = createResumableModelFetch({
      fetcher: vi.fn(async () => response),
      partialStorage: partial.storage,
    })

    await (await resumable.fetch('https://models.test/model.onnx')).arrayBuffer()

    expect(partial.storage.append).toHaveBeenCalledOnce()
    expect(warn).toHaveBeenCalledWith(
      'Partial model download could not be stored.',
      expect.any(Error),
    )
  })

  it('should flush pending bytes and cancel the source stream', async () => {
    const partial = createPartialStorage()
    const cancel = vi.fn()
    const response = new Response(
      new ReadableStream({
        cancel,
        start(controller) {
          controller.enqueue(Uint8Array.of(1, 2))
        },
      }),
      {headers: createHeaders(2)},
    )
    const resumable = createResumableModelFetch({
      fetcher: vi.fn(async () => response),
      partialStorage: partial.storage,
    })
    const persisted = await resumable.fetch('https://models.test/model.onnx')
    const reader = persisted.body?.getReader()
    await reader?.read()

    await reader?.cancel('stop')

    expect(partial.storage.append).toHaveBeenCalledWith(
      'https://models.test/model.onnx',
      Uint8Array.of(1, 2),
    )
    expect(cancel).toHaveBeenCalledWith('stop')
  })

  it('should restart after a zero-byte partial', async () => {
    const url = 'https://models.test/model.onnx'
    const partial = createPartialStorage({body: new Uint8Array(), metadata: createMetadata(url)})
    const fetcher = vi.fn<typeof fetch>(
      async () => new Response('complete', {headers: createHeaders(8)}),
    )
    const resumable = createResumableModelFetch({fetcher, partialStorage: partial.storage})

    expect(await (await resumable.fetch(url)).text()).toBe('complete')
    expect(fetcher).toHaveBeenCalledOnce()
  })

  it('should restart when the range request rejects', async () => {
    const url = 'https://models.test/model.onnx'
    const partial = createPartialStorage({
      body: new TextEncoder().encode('part'),
      metadata: createMetadata(url),
    })
    const fetcher = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new Error('range failed'))
      .mockResolvedValueOnce(new Response('complete', {headers: createHeaders(8)}))
    const resumable = createResumableModelFetch({fetcher, partialStorage: partial.storage})

    expect(await (await resumable.fetch(url)).text()).toBe('complete')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('should cancel an invalid partial-content response before restarting', async () => {
    const url = 'https://models.test/model.onnx'
    const partial = createPartialStorage({
      body: new TextEncoder().encode('part'),
      metadata: createMetadata(url),
    })
    const cancel = vi.fn()
    const invalidResponse = new Response(new ReadableStream({cancel}), {
      headers: {'content-range': 'bytes 3-7/8'},
      status: 206,
    })
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(invalidResponse)
      .mockResolvedValueOnce(new Response('complete', {headers: createHeaders(8)}))
    const resumable = createResumableModelFetch({fetcher, partialStorage: partial.storage})

    expect(await (await resumable.fetch(url)).text()).toBe('complete')
    expect(cancel).toHaveBeenCalledOnce()
  })

  it('should restart when canceling an invalid partial-content response fails', async () => {
    const url = 'https://models.test/model.onnx'
    const partial = createPartialStorage({
      body: new TextEncoder().encode('part'),
      metadata: createMetadata(url),
    })
    const cancelError = new Error('cancel failed')
    const cancel = vi.fn(() => Promise.reject(cancelError))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const invalidResponse = new Response(new ReadableStream({cancel}), {
      headers: {'content-range': 'bytes 3-7/8'},
      status: 206,
    })
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(invalidResponse)
      .mockResolvedValueOnce(new Response('complete', {headers: createHeaders(8)}))
    const resumable = createResumableModelFetch({fetcher, partialStorage: partial.storage})

    expect(await (await resumable.fetch(url)).text()).toBe('complete')
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect(warn).toHaveBeenCalledWith(
      'Invalid partial model response could not be canceled.',
      cancelError,
    )
  })

  it.each(['invalid', 'bytes 3-7/8', 'bytes 4-7/9'])(
    'should discard an invalid partial-content response with range %s',
    async (contentRange) => {
      const url = 'https://models.test/model.onnx'
      const partial = createPartialStorage({
        body: new TextEncoder().encode('part'),
        metadata: createMetadata(url),
      })
      const fetcher = vi
        .fn<typeof fetch>()
        .mockResolvedValueOnce(
          new Response('bad', {headers: {'content-range': contentRange}, status: 206}),
        )
        .mockResolvedValueOnce(new Response('complete', {headers: createHeaders(8)}))
      const resumable = createResumableModelFetch({fetcher, partialStorage: partial.storage})

      expect(await (await resumable.fetch(url)).text()).toBe('complete')
      expect(partial.storage.delete).toHaveBeenCalledWith(url)
    },
  )
})
