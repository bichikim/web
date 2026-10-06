import {Zip, ZipPassThrough} from 'fflate'

export interface NamedBlob {
  readonly blob: Blob
  readonly name: string
}

// User-approved side-effect exception for this ZIP streaming adapter only:
// archive.add(entry) mutates the passed archive; entry.push mutates the new entry.
// fflate needs add before push and does not replay a populated entry on later add,
// so a pure input-to-completed-entry helper cannot replace this streaming flow.
// Reading chunks sequentially keeps one Blob reader active without buffering
// all source files. A buffered ZIP API would add input memory and need explicit
// entry-order guarantees; this does not rule out other pure ZIP implementations.
const appendArchive = async (archive: Zip, blob: Blob, name: string): Promise<void> => {
  const entry = new ZipPassThrough(name)
  archive.add(entry)
  const reader = blob.stream().getReader()
  try {
    let chunk = await reader.read()
    while (!chunk.done) {
      entry.push(chunk.value)
      // oxlint-disable-next-line no-await-in-loop -- Read one chunk at a time to bound input memory.
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
  for (const file of files) {
    let {name} = file
    let suffix = 1
    while (names.has(name)) {
      name = `${suffix}-${file.name}`
      suffix += 1
    }
    names.add(name)
    // oxlint-disable-next-line no-await-in-loop -- Sequential streaming keeps one reader active and bounds input memory.
    await appendArchive(archive, file.blob, name)
  }
  archive.end()
  return new Blob(chunks, {type: 'application/zip'})
}
