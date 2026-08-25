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

describe('createResumableModelFetch', () => {
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
