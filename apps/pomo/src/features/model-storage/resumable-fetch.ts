const PARTIAL_DIRECTORY_NAME = 'pomo-model-downloads'
const BYTES_PER_KIBIBYTE = 1024
const BYTES_PER_MEBIBYTE = BYTES_PER_KIBIBYTE * BYTES_PER_KIBIBYTE
const PARTIAL_CHUNK_MEBIBYTES = 8
const PARTIAL_CHUNK_SIZE = PARTIAL_CHUNK_MEBIBYTES * BYTES_PER_MEBIBYTE
const HEXADECIMAL_RADIX = 16
const HTTP_PARTIAL_CONTENT_STATUS = 206

interface PartialDownloadMetadata {
  readonly contentType: string | null
  readonly etag: string | null
  readonly lastModified: string | null
  readonly totalBytes: number
  readonly url: string
}

interface PartialDownload {
  readonly body: Blob
  readonly metadata: PartialDownloadMetadata
}

export interface PartialDownloadStorage {
  append(url: string, chunk: Uint8Array): Promise<void>
  delete(url: string): Promise<void>
  get(url: string): Promise<PartialDownload | null>
  reset(metadata: PartialDownloadMetadata): Promise<void>
}

export interface CreateResumableModelFetchOptions {
  readonly fetcher?: typeof fetch
  readonly partialStorage?: PartialDownloadStorage | null
}

export interface ResumableModelFetch {
  readonly deletePartial: (url: string) => Promise<void>
  readonly fetch: typeof fetch
}

interface PartialFileNames {
  readonly data: string
  readonly metadata: string
}

interface ContentRange {
  readonly start: number
  readonly total: number
}

const createFileNames = async (url: string): Promise<PartialFileNames> => {
  const data = new TextEncoder().encode(url)
  const digest = await crypto.subtle.digest('SHA-256', data)
  const key = Array.from(new Uint8Array(digest), (value) =>
    value.toString(HEXADECIMAL_RADIX).padStart(2, '0'),
  ).join('')

  return {data: `${key}.part`, metadata: `${key}.json`}
}

const getPartialDirectory = async () => {
  const root = await navigator.storage.getDirectory()
  return root.getDirectoryHandle(PARTIAL_DIRECTORY_NAME, {create: true})
}

const removeFile = async (directory: FileSystemDirectoryHandle, fileName: string) => {
  try {
    await directory.removeEntry(fileName)
  } catch (error: unknown) {
    if (!(error instanceof DOMException) || error.name !== 'NotFoundError') {
      throw error
    }
  }
}

/** Stores resumable model fragments in the origin-private file system. */
export const createOpfsPartialDownloadStorage = (): PartialDownloadStorage | null => {
  if (
    typeof navigator === 'undefined' ||
    !('storage' in navigator) ||
    typeof navigator.storage.getDirectory !== 'function'
  ) {
    return null
  }

  return {
    async append(url, chunk) {
      const directory = await getPartialDirectory()
      const names = await createFileNames(url)
      const handle = await directory.getFileHandle(names.data, {create: true})
      const file = await handle.getFile()
      const writable = await handle.createWritable({keepExistingData: true})

      try {
        await writable.seek(file.size)
        await writable.write(chunk as Uint8Array<ArrayBuffer>)
        await writable.close()
      } catch (error: unknown) {
        await writable.abort(error)
        throw error
      }
    },
    async delete(url) {
      const directory = await getPartialDirectory()
      const names = await createFileNames(url)
      await Promise.all([removeFile(directory, names.data), removeFile(directory, names.metadata)])
    },
    async get(url) {
      try {
        const directory = await getPartialDirectory()
        const names = await createFileNames(url)
        const metadataHandle = await directory.getFileHandle(names.metadata)
        const dataHandle = await directory.getFileHandle(names.data)
        const metadata: unknown = JSON.parse(await (await metadataHandle.getFile()).text())

        if (!isPartialDownloadMetadata(metadata) || metadata.url !== url) {
          await this.delete(url)
          return null
        }

        return {body: await dataHandle.getFile(), metadata}
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === 'NotFoundError') {
          return null
        }

        throw error
      }
    },
    async reset(metadata) {
      const directory = await getPartialDirectory()
      const names = await createFileNames(metadata.url)
      await removeFile(directory, names.data)
      const dataHandle = await directory.getFileHandle(names.data, {create: true})
      const dataWritable = await dataHandle.createWritable()
      await dataWritable.close()
      const metadataHandle = await directory.getFileHandle(names.metadata, {create: true})
      const metadataWritable = await metadataHandle.createWritable()

      try {
        await metadataWritable.write(JSON.stringify(metadata))
        await metadataWritable.close()
      } catch (error: unknown) {
        await metadataWritable.abort(error)
        throw error
      }
    },
  }
}

const isPartialDownloadMetadata = (value: unknown): value is PartialDownloadMetadata => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const metadata = value as Record<string, unknown>
  return (
    (typeof metadata.contentType === 'string' || metadata.contentType === null) &&
    (typeof metadata.etag === 'string' || metadata.etag === null) &&
    (typeof metadata.lastModified === 'string' || metadata.lastModified === null) &&
    typeof metadata.totalBytes === 'number' &&
    Number.isSafeInteger(metadata.totalBytes) &&
    metadata.totalBytes > 0 &&
    typeof metadata.url === 'string'
  )
}

const parseContentRange = (value: string | null): ContentRange | null => {
  const match = /^bytes (?<start>\d+)-\d+\/(?<total>\d+)$/u.exec(value ?? '')

  if (match?.groups === undefined) {
    return null
  }

  return {start: Number(match.groups.start), total: Number(match.groups.total)}
}

const getRequestUrl = (input: RequestInfo | URL) => {
  if (typeof input === 'string') {
    return input
  }

  return input instanceof URL ? input.href : input.url
}

const isResumableRequest = (input: RequestInfo | URL, init?: RequestInit) => {
  const method = init?.method ?? (input instanceof Request ? input.method : 'GET')
  const headers = new Headers(input instanceof Request ? input.headers : undefined)

  for (const [name, value] of new Headers(init?.headers)) {
    headers.set(name, value)
  }

  if (method.toUpperCase() !== 'GET' || headers.has('range')) {
    return false
  }

  try {
    const {protocol} = new URL(getRequestUrl(input))
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

const createResponseHeaders = (metadata: PartialDownloadMetadata) => {
  const headers = new Headers({
    'accept-ranges': 'bytes',
    'content-length': metadata.totalBytes.toString(),
  })

  if (metadata.contentType !== null) {
    headers.set('content-type', metadata.contentType)
  }
  if (metadata.etag !== null) {
    headers.set('etag', metadata.etag)
  }
  if (metadata.lastModified !== null) {
    headers.set('last-modified', metadata.lastModified)
  }

  return headers
}

const createMetadata = (url: string, response: Response): PartialDownloadMetadata | null => {
  const {headers} = response
  const totalBytes = Number(headers.get('content-length'))
  const supportsRanges = headers.get('accept-ranges')?.toLowerCase() === 'bytes'
  const etag = headers.get('etag')
  const lastModified = headers.get('last-modified')

  if (
    !supportsRanges ||
    !Number.isSafeInteger(totalBytes) ||
    totalBytes <= 0 ||
    (etag === null && lastModified === null)
  ) {
    return null
  }

  return {
    contentType: headers.get('content-type'),
    etag,
    lastModified,
    totalBytes,
    url,
  }
}

const createPersistedStream = (
  response: Response,
  storage: PartialDownloadStorage,
  url: string,
): ReadableStream<Uint8Array> | null => {
  if (response.body === null) {
    return null
  }

  const reader = response.body.getReader()
  let chunks: Array<Uint8Array> = []
  let chunkBytes = 0
  let storageAvailable = true

  const flush = async () => {
    if (chunkBytes === 0) {
      return
    }

    const chunk = new Uint8Array(chunkBytes)
    let offset = 0

    for (const value of chunks) {
      chunk.set(value, offset)
      offset += value.byteLength
    }

    chunks = []
    chunkBytes = 0
    if (storageAvailable) {
      try {
        await storage.append(url, chunk)
      } catch (error: unknown) {
        storageAvailable = false
        console.warn('Partial model download could not be stored.', error)
      }
    }
  }

  return new ReadableStream({
    async cancel(reason) {
      await flush()
      await reader.cancel(reason)
    },
    async pull(controller) {
      const result = await reader.read()

      if (result.done) {
        await flush()
        controller.close()
        return
      }

      chunks.push(result.value)
      chunkBytes += result.value.byteLength
      if (chunkBytes >= PARTIAL_CHUNK_SIZE) {
        await flush()
      }
      controller.enqueue(result.value)
    },
  })
}

const createBlobStream = (blob: Blob): ReadableStream<Uint8Array> => {
  if (typeof blob.stream === 'function') {
    return blob.stream()
  }

  return new ReadableStream({
    async start(controller) {
      controller.enqueue(new Uint8Array(await blob.arrayBuffer()))
      controller.close()
    },
  })
}

const combineStreams = (
  existing: ReadableStream<Uint8Array>,
  remaining: ReadableStream<Uint8Array>,
) => {
  const existingReader = existing.getReader()
  const remainingReader = remaining.getReader()
  let readingExisting = true

  return new ReadableStream<Uint8Array>({
    async cancel(reason) {
      await Promise.all([existingReader.cancel(reason), remainingReader.cancel(reason)])
    },
    async pull(controller) {
      const reader = readingExisting ? existingReader : remainingReader
      const result = await reader.read()

      if (!result.done) {
        controller.enqueue(result.value)
        return
      }

      if (readingExisting) {
        readingExisting = false
        const nextResult = await remainingReader.read()
        if (!nextResult.done) {
          controller.enqueue(nextResult.value)
          return
        }
      }

      controller.close()
    },
  })
}

const createResumedResponse = (
  partial: PartialDownload,
  response: Response,
  storage: PartialDownloadStorage,
  url: string,
) => {
  const remaining = createPersistedStream(response, storage, url)

  if (remaining === null) {
    return null
  }

  return new Response(combineStreams(createBlobStream(partial.body), remaining), {
    headers: createResponseHeaders(partial.metadata),
    status: 200,
    statusText: 'OK',
  })
}

const readPartial = async (storage: PartialDownloadStorage, url: string) => {
  try {
    return await storage.get(url)
  } catch (error: unknown) {
    console.warn('Partial model download could not be read.', error)
    return null
  }
}

const deletePartial = async (storage: PartialDownloadStorage, url: string) => {
  try {
    await storage.delete(url)
  } catch (error: unknown) {
    console.warn('Partial model download could not be reset.', error)
  }
}

const initializePartialDownload = async (
  response: Response,
  storage: PartialDownloadStorage,
  url: string,
) => {
  const metadata = createMetadata(url, response)

  if (metadata === null || response.body === null) {
    return response
  }

  try {
    await storage.reset(metadata)
  } catch (error: unknown) {
    console.warn('Partial model download could not be initialized.', error)
    return response
  }

  const body = createPersistedStream(response, storage, url)
  return body === null ? response : new Response(body, response)
}

interface ResumePartialDownloadOptions {
  readonly fetcher: typeof fetch
  readonly init?: RequestInit
  readonly input: RequestInfo | URL
  readonly partial: PartialDownload
  readonly storage: PartialDownloadStorage
  readonly url: string
}

const createResumeHeaders = (
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  partial: PartialDownload,
) => {
  const headers = new Headers(input instanceof Request ? input.headers : undefined)

  for (const [name, value] of new Headers(init?.headers)) {
    headers.set(name, value)
  }
  headers.set('range', `bytes=${partial.body.size}-`)
  const validator = partial.metadata.etag ?? partial.metadata.lastModified
  if (validator !== null) {
    headers.set('if-range', validator)
  }

  return headers
}

const resumePartialDownload = async (
  options: ResumePartialDownloadOptions,
): Promise<Response | null> => {
  if (options.partial.body.size === options.partial.metadata.totalBytes) {
    return new Response(createBlobStream(options.partial.body), {
      headers: createResponseHeaders(options.partial.metadata),
      status: 200,
      statusText: 'OK',
    })
  }

  if (options.partial.body.size === 0) {
    return null
  }

  const headers = createResumeHeaders(options.input, options.init, options.partial)
  let response: Response

  try {
    response = await options.fetcher(options.input, {...options.init, headers})
  } catch {
    return null
  }
  const contentRange = parseContentRange(response.headers.get('content-range'))
  const canResume =
    response.status === HTTP_PARTIAL_CONTENT_STATUS &&
    contentRange?.start === options.partial.body.size &&
    contentRange.total === options.partial.metadata.totalBytes

  if (canResume) {
    const resumedResponse = createResumedResponse(
      options.partial,
      response,
      options.storage,
      options.url,
    )
    if (resumedResponse !== null) {
      return resumedResponse
    }
  }

  await deletePartial(options.storage, options.url)
  return response.status === HTTP_PARTIAL_CONTENT_STATUS
    ? null
    : initializePartialDownload(response, options.storage, options.url)
}

/** Adds durable byte-range continuation to model fetches when the server supports it. */
export const createResumableModelFetch = (
  options: CreateResumableModelFetchOptions = {},
): ResumableModelFetch => {
  const fetcher = options.fetcher ?? fetch.bind(globalThis)
  const storage =
    'partialStorage' in options
      ? (options.partialStorage ?? null)
      : createOpfsPartialDownloadStorage()

  const resumableFetch: typeof fetch = async (input, init) => {
    if (storage === null || !isResumableRequest(input, init)) {
      return fetcher(input, init)
    }

    const url = getRequestUrl(input)
    const partial = await readPartial(storage, url)

    if (partial !== null) {
      const resumedResponse = await resumePartialDownload({
        fetcher,
        init,
        input,
        partial,
        storage,
        url,
      })
      if (resumedResponse !== null) {
        return resumedResponse
      }
    }

    const response = await fetcher(input, init)
    return initializePartialDownload(response, storage, url)
  }

  return {
    async deletePartial(url) {
      try {
        await storage?.delete(url)
      } catch (error: unknown) {
        console.warn('Completed partial model download could not be removed.', error)
      }
    },
    fetch: resumableFetch,
  }
}
