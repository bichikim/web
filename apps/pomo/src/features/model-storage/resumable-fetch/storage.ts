import {MODEL_PARTIAL_DIRECTORY_NAME} from '../storage'

const HEXADECIMAL_RADIX = 16

export interface PartialDownloadMetadata {
  readonly contentType: string | null
  readonly etag: string | null
  readonly lastModified: string | null
  readonly totalBytes: number
  readonly url: string
}

export interface PartialDownload {
  readonly body: Blob
  readonly metadata: PartialDownloadMetadata
}

export interface PartialDownloadStorage {
  append(url: string, chunk: Uint8Array): Promise<void>
  delete(url: string): Promise<void>
  get(url: string): Promise<PartialDownload | null>
  reset(metadata: PartialDownloadMetadata): Promise<void>
}

interface PartialFileNames {
  readonly data: string
  readonly metadata: string
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
  return root.getDirectoryHandle(MODEL_PARTIAL_DIRECTORY_NAME, {create: true})
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
