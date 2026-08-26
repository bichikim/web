import {afterEach, describe, expect, it, vi} from 'vitest'

const httpMocks = vi.hoisted(() => ({fetch: vi.fn()}))

vi.mock('../../http-client', () => ({httpFetch: httpMocks.fetch}))

import {
  createOpfsPartialDownloadStorage,
  createResumableModelFetch,
  type PartialDownloadStorage,
} from '../resumable-fetch'

type PartialMetadata = Parameters<PartialDownloadStorage['reset']>[0]

interface StoredPartial {
  body: Uint8Array
  metadata: PartialMetadata
}

const notFoundError = () => new DOMException('missing', 'NotFoundError')

const createVirtualOpfs = () => {
  const files = new Map<string, Uint8Array>()
  const writables: Array<{
    readonly abort: ReturnType<typeof vi.fn>
    readonly close: ReturnType<typeof vi.fn>
    readonly fileName: string
    readonly seek: ReturnType<typeof vi.fn>
    readonly write: ReturnType<typeof vi.fn>
  }> = []
  let failingWriteSuffix: string | null = null

  const getFileHandle = vi.fn(async (fileName: string, options?: {create?: boolean}) => {
    if (!files.has(fileName)) {
      if (options?.create !== true) {
        throw notFoundError()
      }
      files.set(fileName, new Uint8Array())
    }

    return {
      createWritable: vi.fn(async (writableOptions?: {keepExistingData?: boolean}) => {
        let data =
          writableOptions?.keepExistingData === true
            ? new Uint8Array(files.get(fileName) ?? [])
            : new Uint8Array()
        let position = 0
        const abort = vi.fn(async () => undefined)
        const close = vi.fn(async () => {
          files.set(fileName, data)
        })
        const seek = vi.fn(async (nextPosition: number) => {
          position = nextPosition
        })
        const write = vi.fn(async (value: string | Uint8Array) => {
          if (failingWriteSuffix !== null && fileName.endsWith(failingWriteSuffix)) {
            throw new Error(`write failed: ${failingWriteSuffix}`)
          }

          const chunk = typeof value === 'string' ? new TextEncoder().encode(value) : value
          const next = new Uint8Array(Math.max(data.byteLength, position + chunk.byteLength))
          next.set(data)
          next.set(chunk, position)
          data = next
          position += chunk.byteLength
        })
        const writable = {abort, close, fileName, seek, write}
        writables.push(writable)
        return writable
      }),
      getFile: vi.fn(async () => {
        const data = new Uint8Array(files.get(fileName) ?? [])
        return {
          arrayBuffer: async () => data.buffer,
          size: data.byteLength,
          stream: () =>
            new ReadableStream({
              start(controller) {
                controller.enqueue(data)
                controller.close()
              },
            }),
          text: async () => new TextDecoder().decode(data),
        } as Blob
      }),
    }
  })
  const removeEntry = vi.fn(async (fileName: string) => {
    if (!files.delete(fileName)) {
      throw notFoundError()
    }
  })
  const directory = {getFileHandle, removeEntry}
  const getDirectoryHandle = vi.fn(async () => directory)
  const getDirectory = vi.fn(async () => ({getDirectoryHandle}))

  vi.stubGlobal('navigator', {storage: {getDirectory}})
  vi.stubGlobal('crypto', {
    subtle: {
      digest: vi.fn(async () => new Uint8Array(32).buffer),
    },
  })

  return {
    directory,
    files,
    setFailingWriteSuffix: (suffix: string | null) => {
      failingWriteSuffix = suffix
    },
    setJson: (value: unknown) => {
      files.set(`${'00'.repeat(32)}.json`, new TextEncoder().encode(JSON.stringify(value)))
    },
    setPart: (value: string) => {
      files.set(`${'00'.repeat(32)}.part`, new TextEncoder().encode(value))
    },
    writables,
  }
}

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

const createPartialStorage = (initial?: StoredPartial) => {
  let partial = initial
  const storage: PartialDownloadStorage = {
    append: vi.fn(async (_url, chunk) => {
      if (partial === undefined) {
        throw new Error('Partial metadata is missing.')
      }

      const body = new Uint8Array(partial.body.byteLength + chunk.byteLength)
      body.set(partial.body)
      body.set(chunk, partial.body.byteLength)
      partial = {...partial, body}
    }),
    delete: vi.fn(async () => {
      partial = undefined
    }),
    get: vi.fn(async () =>
      partial === undefined
        ? null
        : {body: createTestBlob(partial.body), metadata: partial.metadata},
    ),
    reset: vi.fn(async (metadata) => {
      partial = {body: new Uint8Array(), metadata}
    }),
  }

  return {getPartial: () => partial, storage}
}

const createTestBlob = (body: Uint8Array, withStream = true): Blob =>
  ({
    arrayBuffer: async () => body.buffer,
    size: body.byteLength,
    stream: withStream
      ? () =>
          new ReadableStream({
            start(controller) {
              controller.enqueue(new Uint8Array(body))
              controller.close()
            },
          })
      : undefined,
  }) as unknown as Blob

const createHeaders = (length: number) => ({
  'accept-ranges': 'bytes',
  'content-length': length.toString(),
  'content-type': 'application/octet-stream',
  etag: 'model-v1',
})

describe('createResumableModelFetch stream lifecycle', () => {
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
