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

describe('createResumableModelFetch network behavior', () => {
  it('should persist a range-capable download while it is consumed', async () => {
    const partial = createPartialStorage()
    const fetcher = vi.fn<typeof fetch>(
      async () => new Response('complete', {headers: createHeaders(8)}),
    )
    const resumable = createResumableModelFetch({fetcher, partialStorage: partial.storage})

    const response = await resumable.fetch('https://models.test/model.onnx')

    expect(await response.text()).toBe('complete')
    expect(new TextDecoder().decode(partial.getPartial()?.body)).toBe('complete')
  })

  it('should request and combine only the missing byte range', async () => {
    const url = 'https://models.test/model.onnx'
    const metadata = {
      contentType: 'application/octet-stream',
      etag: 'model-v1',
      lastModified: null,
      totalBytes: 8,
      url,
    }
    const partial = createPartialStorage({body: new TextEncoder().encode('comp'), metadata})
    const fetcher = vi.fn<typeof fetch>(
      async () =>
        new Response('lete', {
          headers: {...createHeaders(4), 'content-range': 'bytes 4-7/8'},
          status: 206,
        }),
    )
    const resumable = createResumableModelFetch({fetcher, partialStorage: partial.storage})

    const response = await resumable.fetch(url)

    expect(await response.text()).toBe('complete')
    const request = fetcher.mock.calls[0]
    expect(new Headers(request?.[1]?.headers).get('range')).toBe('bytes=4-')
    expect(new Headers(request?.[1]?.headers).get('if-range')).toBe('model-v1')
  })

  it('should restart the file when the server does not accept the byte range', async () => {
    const url = 'https://models.test/model.onnx'
    const metadata = {
      contentType: 'application/octet-stream',
      etag: 'model-v1',
      lastModified: null,
      totalBytes: 8,
      url,
    }
    const partial = createPartialStorage({body: new TextEncoder().encode('old'), metadata})
    const fetcher = vi.fn<typeof fetch>(
      async () => new Response('complete', {headers: createHeaders(8)}),
    )
    const resumable = createResumableModelFetch({fetcher, partialStorage: partial.storage})

    const response = await resumable.fetch(url)

    expect(await response.text()).toBe('complete')
    expect(new TextDecoder().decode(partial.getPartial()?.body)).toBe('complete')
  })

  it('should return a completed partial file without another network request', async () => {
    const url = 'https://models.test/model.onnx'
    const metadata = {
      contentType: 'application/octet-stream',
      etag: 'model-v1',
      lastModified: null,
      totalBytes: 8,
      url,
    }
    const partial = createPartialStorage({body: new TextEncoder().encode('complete'), metadata})
    const fetcher = vi.fn<typeof fetch>()
    const resumable = createResumableModelFetch({fetcher, partialStorage: partial.storage})

    const response = await resumable.fetch(url)

    expect(await response.text()).toBe('complete')
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('should use the default fetcher when OPFS is unavailable', async () => {
    vi.stubGlobal('navigator', undefined)
    httpMocks.fetch.mockResolvedValue(new Response('default'))
    const resumable = createResumableModelFetch()

    expect(await (await resumable.fetch('https://models.test/model.onnx')).text()).toBe('default')
    expect(httpMocks.fetch).toHaveBeenCalledOnce()
  })

  it('should bypass persistence when partial storage is explicitly unavailable', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response('direct'))
    const resumable = createResumableModelFetch({fetcher, partialStorage: undefined})

    expect(await (await resumable.fetch('https://models.test/model.onnx')).text()).toBe('direct')
    await resumable.deletePartial('https://models.test/model.onnx')
    expect(fetcher).toHaveBeenCalledOnce()
  })

  it.each([
    {
      init: {method: 'POST'},
      input: new Request('https://models.test/model.onnx', {headers: {'x-input': 'yes'}}),
    },
    {
      init: {headers: {range: 'bytes=0-3'}},
      input: 'https://models.test/model.onnx',
    },
    {init: undefined, input: new URL('ftp://models.test/model.onnx')},
    {init: undefined, input: 'not a url'},
  ])('should bypass non-resumable requests', async ({init, input}) => {
    const partial = createPartialStorage()
    const fetcher = vi.fn<typeof fetch>(async () => new Response('direct'))
    const resumable = createResumableModelFetch({fetcher, partialStorage: partial.storage})

    expect(await (await resumable.fetch(input, init)).text()).toBe('direct')
    expect(partial.storage.get).not.toHaveBeenCalled()
  })

  it.each([
    {'accept-ranges': 'none', 'content-length': '8', etag: 'v1'},
    {'accept-ranges': 'bytes', 'content-length': '8.5', etag: 'v1'},
    {'accept-ranges': 'bytes', 'content-length': '0', etag: 'v1'},
    {'accept-ranges': 'bytes', 'content-length': '8'},
  ])('should skip persistence for invalid response metadata', async (headers) => {
    const partial = createPartialStorage()
    const fetcher = vi.fn<typeof fetch>(
      async () => new Response('complete', {headers: headers as HeadersInit}),
    )
    const resumable = createResumableModelFetch({fetcher, partialStorage: partial.storage})

    expect(await (await resumable.fetch('https://models.test/model.onnx')).text()).toBe('complete')
    expect(partial.storage.reset).not.toHaveBeenCalled()
  })

  it('should preserve last-modified metadata without optional content headers', async () => {
    const partial = createPartialStorage()
    const fetcher = vi.fn<typeof fetch>(
      async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode('complete'))
              controller.close()
            },
          }),
          {
            headers: {
              'accept-ranges': 'bytes',
              'content-length': '8',
              'last-modified': 'Wed, 21 Oct 2015 07:28:00 GMT',
            },
          },
        ),
    )
    const resumable = createResumableModelFetch({fetcher, partialStorage: partial.storage})

    const first = await resumable.fetch('https://models.test/model.onnx')
    await first.arrayBuffer()
    const completed = await resumable.fetch('https://models.test/model.onnx')

    expect(completed.headers.get('content-type')).toBeNull()
    expect(completed.headers.get('etag')).toBeNull()
    expect(completed.headers.get('last-modified')).toBe('Wed, 21 Oct 2015 07:28:00 GMT')
  })

  it('should return a bodyless range-capable response without initializing storage', async () => {
    const partial = createPartialStorage()
    const response = new Response(null, {headers: createHeaders(8)})
    const fetcher = vi.fn<typeof fetch>(async () => response)
    const resumable = createResumableModelFetch({fetcher, partialStorage: partial.storage})

    expect(await resumable.fetch('https://models.test/model.onnx')).toBe(response)
    expect(partial.storage.reset).not.toHaveBeenCalled()
  })

  it('should return the original response when its body disappears after storage reset', async () => {
    const partial = createPartialStorage()
    let bodyReadCount = 0
    const response = {
      get body() {
        bodyReadCount += 1
        return bodyReadCount === 1
          ? new ReadableStream<Uint8Array>({start: (controller) => controller.close()})
          : null
      },
      headers: new Headers(createHeaders(8)),
    } as Response
    const resumable = createResumableModelFetch({
      fetcher: vi.fn(async () => response),
      partialStorage: partial.storage,
    })

    expect(await resumable.fetch('https://models.test/model.onnx')).toBe(response)
    expect(partial.storage.reset).toHaveBeenCalledOnce()
  })
})
