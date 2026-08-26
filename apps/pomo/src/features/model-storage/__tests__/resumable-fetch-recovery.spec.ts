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
