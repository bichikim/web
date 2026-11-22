import {concatUint8Arrays} from 'uint8array-extras'
import {afterEach, describe, expect, it, vi} from 'vitest'

const httpMocks = vi.hoisted(() => ({fetch: vi.fn()}))

vi.mock('../../http-client', () => ({httpFetch: httpMocks.fetch}))
vi.mock(import('uint8array-extras'), async (importOriginal) => {
  const original = await importOriginal()
  return {...original, concatUint8Arrays: vi.fn(original.concatUint8Arrays)}
})

import {createResumableModelFetch, type PartialDownloadStorage} from '../resumable-fetch'
import {createPartialStorage, createTestBlob} from './support/partial-storage'

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
  vi.mocked(concatUint8Arrays).mockClear()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const createHeaders = (length: number) => ({
  'accept-ranges': 'bytes',
  'content-length': length.toString(),
  'content-type': 'application/octet-stream',
  etag: 'model-v1',
})

describe('createResumableModelFetch stream lifecycle', () => {
  it('should persist ordered subarray bytes in a buffer independent of streamed views', async () => {
    const url = 'https://models.test/model.onnx'
    const backing = Uint8Array.of(99, 1, 2, 3, 4, 88)
    const first = backing.subarray(1, 3)
    const second = backing.subarray(3, 5)
    const storage: PartialDownloadStorage = {
      append: vi.fn(async () => undefined),
      delete: vi.fn(async () => undefined),
      get: vi.fn(async () => null),
      reset: vi.fn(async () => undefined),
    }
    const fetcher = vi.fn<typeof fetch>(
      async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(first)
              controller.enqueue(second)
              controller.close()
            },
          }),
          {headers: createHeaders(4)},
        ),
    )
    const resumable = createResumableModelFetch({fetcher, partialStorage: storage})

    expect(new Uint8Array(await (await resumable.fetch(url)).arrayBuffer())).toEqual(
      Uint8Array.of(1, 2, 3, 4),
    )
    expect(storage.append).toHaveBeenCalledExactlyOnceWith(url, Uint8Array.of(1, 2, 3, 4))
    const persisted = vi.mocked(storage.append).mock.calls[0]?.[1]
    expect(persisted?.buffer).not.toBe(backing.buffer)
    backing[1] = 9
    expect(persisted).toEqual(Uint8Array.of(1, 2, 3, 4))
    expect(backing).toEqual(Uint8Array.of(99, 9, 2, 3, 4, 88))
  })

  it('should stop combining chunks after partial storage rejects an append', async () => {
    const url = 'https://models.test/model.onnx'
    const batch = new Uint8Array(8 * 1024 * 1024)
    const chunks = [batch, batch.subarray(0), Uint8Array.of(1, 2)]
    const partial = createPartialStorage()
    const error = new Error('storage unavailable')
    const append = vi.mocked(partial.storage.append).mockRejectedValueOnce(error)
    const concat = vi.mocked(concatUint8Arrays).mockClear()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const length = chunks.reduce((total, chunk) => total + chunk.byteLength, 0)
    const fetcher = vi.fn<typeof fetch>(
      async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              for (const chunk of chunks) {
                controller.enqueue(chunk)
              }
              controller.close()
            },
          }),
          {headers: createHeaders(length)},
        ),
    )
    const resumable = createResumableModelFetch({fetcher, partialStorage: partial.storage})
    const {body} = await resumable.fetch(url)
    if (body === null) {
      throw new Error('Expected a streamed model response.')
    }
    const reader = body.getReader()

    const results = [await reader.read(), await reader.read(), await reader.read()]
    for (const [index, result] of results.entries()) {
      expect(result.done).toBe(false)
      expect(result.value).toBe(chunks[index])
    }
    expect((await reader.read()).done).toBe(true)
    expect(append).toHaveBeenCalledOnce()
    expect(append.mock.calls[0]?.[0]).toBe(url)
    expect(append.mock.calls[0]?.[1].byteLength).toBe(batch.byteLength)
    expect(warn).toHaveBeenCalledExactlyOnceWith(
      'Partial model download could not be stored.',
      error,
    )
    expect(concat).toHaveBeenCalledOnce()
  })

  it('should await the first failed append and cancel without combining later bytes', async () => {
    const url = 'https://models.test/model.onnx'
    const batch = new Uint8Array(8 * 1024 * 1024)
    const tail = Uint8Array.of(1, 2)
    const partial = createPartialStorage()
    const started = Promise.withResolvers<void>()
    const pending = Promise.withResolvers<void>()
    const events: string[] = []
    const append = vi.mocked(partial.storage.append).mockImplementationOnce(async () => {
      events.push('append')
      started.resolve()
      await pending.promise
    })
    const error = new Error('storage unavailable')
    const reason = {message: 'stop'}
    const cancel = vi.fn((value: unknown) => {
      expect(value).toBe(reason)
      events.push('source cancel')
    })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {
      events.push('warn')
    })
    const fetcher = vi.fn<typeof fetch>(
      async () =>
        new Response(
          new ReadableStream({
            cancel: (value) => cancel(value),
            start(controller) {
              controller.enqueue(batch)
              controller.enqueue(tail)
            },
          }),
          {headers: createHeaders(batch.byteLength + tail.byteLength)},
        ),
    )
    const response = await createResumableModelFetch({
      fetcher,
      partialStorage: partial.storage,
    }).fetch(url)
    if (response.body === null) {
      throw new Error('Expected a streamed model response.')
    }
    const reader = response.body.getReader()
    const first = reader.read().then((result) => {
      events.push('first chunk')
      return result
    })
    await started.promise
    expect(events).toEqual(['append'])
    pending.reject(error)
    expect((await first).value).toBe(batch)
    expect((await reader.read()).value).toBe(tail)
    events.push('tail')

    await reader.cancel(reason)

    expect(events).toEqual(['append', 'warn', 'first chunk', 'tail', 'source cancel'])
    expect(append).toHaveBeenCalledOnce()
    expect(warn).toHaveBeenCalledExactlyOnceWith(
      'Partial model download could not be stored.',
      error,
    )
    expect(cancel).toHaveBeenCalledExactlyOnceWith(reason)
    expect(concatUint8Arrays).toHaveBeenCalledOnce()
  })

  it('should restart when a valid partial response has no body', async () => {
    const url = 'https://models.test/model.onnx'
    const partial = createPartialStorage({
      body: new TextEncoder().encode('part'),
      metadata: createMetadata(url),
    })
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(null, {headers: {'content-range': 'bytes 4-7/8'}, status: 206}),
      )
      .mockResolvedValueOnce(new Response('complete', {headers: createHeaders(8)}))
    const resumable = createResumableModelFetch({fetcher, partialStorage: partial.storage})

    expect(await (await resumable.fetch(url)).text()).toBe('complete')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('should combine a legacy body without Blob.stream and an empty remainder', async () => {
    const url = 'https://models.test/model.onnx'
    const metadata = createMetadata(url, {etag: null, lastModified: null})
    const storage: PartialDownloadStorage = {
      append: vi.fn(async () => undefined),
      delete: vi.fn(async () => undefined),
      get: vi.fn(async () => ({
        body: createTestBlob(new TextEncoder().encode('part'), false),
        metadata,
      })),
      reset: vi.fn(async () => undefined),
    }
    const fetcher = vi.fn<typeof fetch>(
      async () =>
        new Response(new ReadableStream({start: (controller) => controller.close()}), {
          headers: {'content-range': 'bytes 4-7/8'},
          status: 206,
        }),
    )
    const resumable = createResumableModelFetch({fetcher, partialStorage: storage})

    const response = await resumable.fetch(new Request(url, {headers: {'x-input': 'yes'}}), {
      headers: {'x-init': 'yes'},
    })

    expect(await response.text()).toBe('part')
    const requestHeaders = new Headers(fetcher.mock.calls[0]?.[1]?.headers)
    expect(requestHeaders.get('x-input')).toBe('yes')
    expect(requestHeaders.get('x-init')).toBe('yes')
    expect(requestHeaders.has('if-range')).toBe(false)
  })

  it('should cancel both streams in a resumed response', async () => {
    const url = 'https://models.test/model.onnx'
    const existingCancel = vi.fn()
    const remainingCancel = vi.fn()
    const storage: PartialDownloadStorage = {
      append: vi.fn(async () => undefined),
      delete: vi.fn(async () => undefined),
      get: vi.fn(async () => ({
        body: {
          size: 4,
          stream: () =>
            new ReadableStream({
              cancel: existingCancel,
              start(controller) {
                controller.enqueue(new TextEncoder().encode('part'))
              },
            }),
        } as Blob,
        metadata: createMetadata(url),
      })),
      reset: vi.fn(async () => undefined),
    }
    const fetcher = vi.fn<typeof fetch>(
      async () =>
        new Response(
          new ReadableStream({
            cancel: remainingCancel,
            start(controller) {
              controller.enqueue(new TextEncoder().encode('done'))
            },
          }),
          {headers: {'content-range': 'bytes 4-7/8'}, status: 206},
        ),
    )
    const resumable = createResumableModelFetch({fetcher, partialStorage: storage})
    const response = await resumable.fetch(url)

    await response.body?.cancel('stop')

    expect(existingCancel).toHaveBeenCalledWith('stop')
    expect(remainingCancel).toHaveBeenCalledWith('stop')
  })

  it('should tolerate internal and explicit partial deletion failures', async () => {
    const url = 'https://models.test/model.onnx'
    const partial = createPartialStorage({
      body: new TextEncoder().encode('old'),
      metadata: createMetadata(url),
    })
    vi.mocked(partial.storage.delete).mockRejectedValue(new Error('delete failed'))
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const fetcher = vi.fn<typeof fetch>(
      async () => new Response('complete', {headers: createHeaders(8)}),
    )
    const resumable = createResumableModelFetch({fetcher, partialStorage: partial.storage})

    await (await resumable.fetch(url)).text()
    await resumable.deletePartial(url)

    expect(warn).toHaveBeenCalledWith(
      'Partial model download could not be reset.',
      expect.any(Error),
    )
    expect(warn).toHaveBeenCalledWith(
      'Completed partial model download could not be removed.',
      expect.any(Error),
    )
  })
})
