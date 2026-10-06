import {Zip, ZipPassThrough} from 'fflate'
import {forEachSequential} from 'src/utils/for-each-sequential'

export interface NamedBlob {
  readonly blob: Blob
  readonly name: string
}

// oxlint-disable no-await-in-loop -- Chunks are read sequentially to bound input memory.
const appendArchive = async (archive: Zip, blob: Blob, name: string): Promise<void> => {
  const entry = new ZipPassThrough(name)
  archive.add(entry)
  const reader = blob.stream().getReader()
  try {
    let chunk = await reader.read()
    while (!chunk.done) {
      entry.push(chunk.value)
      chunk = await reader.read()
    }
    entry.push(new Uint8Array(), true)
  } finally {
    reader.releaseLock()
  }
}

/** Archives Blobs in input order, prefixing colliding names with increasing integers; names otherwise remain verbatim. */
export const createBlobArchive = async (files: readonly NamedBlob[]): Promise<Blob> => {
  const chunks: BlobPart[] = []
  const archive = new Zip((error, data) => {
    if (error !== null) {
      throw error
    }
    chunks.push(new Uint8Array(data))
  })
  const names = new Set<string>()
  await forEachSequential(files, async (file) => {
    let {name} = file
    let suffix = 1
    while (names.has(name)) {
      name = `${suffix}-${file.name}`
      suffix += 1
    }
    names.add(name)
    await appendArchive(archive, file.blob, name)
  })
  archive.end()
  return new Blob(chunks, {type: 'application/zip'})
}
