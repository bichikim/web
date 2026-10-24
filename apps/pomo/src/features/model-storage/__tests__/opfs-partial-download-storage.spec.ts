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

describe('createOpfsPartialDownloadStorage', () => {
  it.each([
    {navigatorValue: undefined},
    {navigatorValue: {}},
    {navigatorValue: {storage: {getDirectory: null}}},
  ])('should return null when OPFS is unavailable', ({navigatorValue}) => {
    vi.stubGlobal('navigator', navigatorValue)

    expect(createOpfsPartialDownloadStorage()).toBeNull()
  })

  it('should reset, append, read, and delete a partial download', async () => {
    createVirtualOpfs()
    const storage = createOpfsPartialDownloadStorage()
    const metadata = createMetadata()

    expect(storage).not.toBeNull()
    await storage?.reset(metadata)
    await storage?.append(metadata.url, new TextEncoder().encode('complete'))
    const partial = await storage?.get(metadata.url)

    expect(partial?.metadata).toEqual(metadata)
    expect(await partial?.body.text()).toBe('complete')

    await storage?.delete(metadata.url)
    expect(await storage?.get(metadata.url)).toBeNull()
  })

  it('should accept nullable response metadata and a last-modified validator', async () => {
    createVirtualOpfs()
    const storage = createOpfsPartialDownloadStorage()
    const metadata = createMetadata(undefined, {
      contentType: null,
      etag: null,
      lastModified: 'Wed, 21 Oct 2015 07:28:00 GMT',
    })

    await storage?.reset(metadata)

    expect((await storage?.get(metadata.url))?.metadata).toEqual(metadata)
  })

  it.each([
    null,
    'invalid',
    {},
    createMetadata(undefined, {contentType: 1 as unknown as string}),
    createMetadata(undefined, {etag: 1 as unknown as string}),
    createMetadata(undefined, {lastModified: 1 as unknown as string}),
    createMetadata(undefined, {totalBytes: '8' as unknown as number}),
    createMetadata(undefined, {totalBytes: Number.MAX_SAFE_INTEGER + 1}),
    createMetadata(undefined, {totalBytes: 0}),
    createMetadata(undefined, {url: 1 as unknown as string}),
  ])('should delete invalid partial metadata', async (metadata) => {
    const opfs = createVirtualOpfs()
    opfs.setJson(metadata)
    opfs.setPart('partial')
    const storage = createOpfsPartialDownloadStorage()

    expect(await storage?.get('https://models.test/model.onnx')).toBeNull()
    expect(opfs.files.size).toBe(0)
  })

  it('should return null only for missing OPFS files', async () => {
    const opfs = createVirtualOpfs()
    const storage = createOpfsPartialDownloadStorage()

    expect(await storage?.get('https://models.test/missing.onnx')).toBeNull()

    opfs.directory.getFileHandle.mockRejectedValueOnce(new Error('OPFS failed'))
    await expect(storage?.get('https://models.test/error.onnx')).rejects.toThrow('OPFS failed')
  })

  it('should abort an append writer when writing fails', async () => {
    const opfs = createVirtualOpfs()
    const storage = createOpfsPartialDownloadStorage()
    const metadata = createMetadata()
    await storage?.reset(metadata)
    opfs.setFailingWriteSuffix('.part')

    await expect(storage?.append(metadata.url, Uint8Array.of(1))).rejects.toThrow(
      'write failed: .part',
    )

    const writer = opfs.writables.findLast((item) => item.fileName.endsWith('.part'))
    expect(writer?.abort).toHaveBeenCalledWith(expect.any(Error))
  })

  it('should abort a metadata writer when reset fails', async () => {
    const opfs = createVirtualOpfs()
    opfs.setFailingWriteSuffix('.json')
    const storage = createOpfsPartialDownloadStorage()

    await expect(storage?.reset(createMetadata())).rejects.toThrow('write failed: .json')

    const writer = opfs.writables.findLast((item) => item.fileName.endsWith('.json'))
    expect(writer?.abort).toHaveBeenCalledWith(expect.any(Error))
  })

  it('should propagate non-missing deletion failures', async () => {
    const opfs = createVirtualOpfs()
    opfs.directory.removeEntry.mockRejectedValue(new Error('delete failed'))
    const storage = createOpfsPartialDownloadStorage()

    await expect(storage?.delete('https://models.test/model.onnx')).rejects.toThrow('delete failed')
  })
})
