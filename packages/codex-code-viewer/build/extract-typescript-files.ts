import {gunzipSync} from 'node:zlib'

/** Extracts regular binary and SDK files from a verified TypeScript platform tarball. */
export const extractTypescriptFiles = (archive: Uint8Array): ReadonlyMap<string, Buffer> => {
  const bytes = gunzipSync(archive)
  const files = new Map<string, Buffer>()
  const BLOCK_SIZE = 512
  const NAME_END = 100
  const SIZE_START = 124
  const SIZE_END = 136
  const TYPE_OFFSET = 156
  const REGULAR_TYPE = '0'.charCodeAt(0)
  let offset = 0
  while (offset + BLOCK_SIZE <= bytes.length) {
    const header = bytes.subarray(offset, offset + BLOCK_SIZE)
    const name = header.subarray(0, NAME_END).toString('utf8').replace(/\0.*$/u, '')
    const size = Number.parseInt(
      header.subarray(SIZE_START, SIZE_END).toString('ascii').replace(/\0.*$/u, '').trim() || '0',
      8,
    )
    if (!Number.isFinite(size) || size < 0 || offset + BLOCK_SIZE + size > bytes.length) {
      throw new Error('Truncated or invalid TypeScript archive entry')
    }
    const regular = header[TYPE_OFFSET] === 0 || header[TYPE_OFFSET] === REGULAR_TYPE
    const selected =
      /^package\/(?:LICENSE|NOTICE\.txt|lib\/(?:tsc(?:\.exe)?|lib(?:\.[^/]+)?\.d\.ts))$/u.test(name)
    if (regular && selected) {
      files.set(
        name.slice(name.lastIndexOf('/') + 1),
        bytes.subarray(offset + BLOCK_SIZE, offset + BLOCK_SIZE + size),
      )
    }
    offset += BLOCK_SIZE + Math.ceil(size / BLOCK_SIZE) * BLOCK_SIZE
  }
  return files
}
