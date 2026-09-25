/* eslint-disable no-bitwise, no-magic-numbers -- CAFF and ZIP encode fixed-width binary fields. */
import {Inflate} from 'fflate'

const HEADER_LENGTH = 54
const MAXIMUM_ENTRY_COUNT = 100_000
const MAXIMUM_ENTRY_BYTES = 256 * 1024 * 1024
const MAXIMUM_ARCHIVE_BYTES = 512 * 1024 * 1024
const INFLATE_CHUNK_BYTES = 16 * 1024

const inflateBounded = (
  stored: Uint8Array,
  start: number,
  end: number,
  path: string,
): Uint8Array => {
  const chunks: Uint8Array[] = []
  let total = 0
  const inflater = new Inflate((chunk) => {
    total += chunk.length
    if (total > MAXIMUM_ENTRY_BYTES) {
      throw new Error(`CMO3 archive entry ${path} exceeds the supported size`)
    }
    chunks.push(chunk)
  })
  for (let offset = start; offset < end; offset += INFLATE_CHUNK_BYTES) {
    const next = Math.min(offset + INFLATE_CHUNK_BYTES, end)
    inflater.push(stored.subarray(offset, next), next === end)
  }
  const output = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    output.set(chunk, offset)
    offset += chunk.length
  }
  return output
}

const unzipEntry = (stored: Uint8Array, path: string): Uint8Array => {
  if (
    stored.length < 30 ||
    stored[0] !== 0x50 ||
    stored[1] !== 0x4b ||
    stored[2] !== 0x03 ||
    stored[3] !== 0x04
  ) {
    throw new Error(`CMO3 archive entry ${path} is not a ZIP file`)
  }
  const view = new DataView(stored.buffer, stored.byteOffset, stored.byteLength)
  const method = view.getUint16(8, true)
  const offset = 30 + view.getUint16(26, true) + view.getUint16(28, true)
  const compressedSize = view.getUint32(18, true)
  const uncompressedSize = view.getUint32(22, true)
  const end = compressedSize === 0 ? stored.length : offset + compressedSize
  if (offset >= stored.length || end > stored.length || uncompressedSize > MAXIMUM_ENTRY_BYTES) {
    throw new Error(`CMO3 archive entry ${path} is outside the supported range`)
  }
  if (method === 0) {
    if (compressedSize === 0) {
      throw new Error(`CMO3 archive entry ${path} has no stored size`)
    }
    return stored.slice(offset, end)
  }
  if (method !== 8) {
    throw new Error(`CMO3 archive entry ${path} uses an unsupported ZIP method`)
  }
  const output = inflateBounded(stored, offset, end, path)
  if (uncompressedSize !== 0 && output.length !== uncompressedSize) {
    throw new Error(`CMO3 archive entry ${path} has an invalid size`)
  }
  return output
}

class ArchiveCursor {
  readonly #bytes: Uint8Array
  readonly #view: DataView
  offset: number

  constructor(bytes: Uint8Array, offset = 0) {
    this.#bytes = bytes
    this.#view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    this.offset = offset
  }

  readByte(key = 0): number {
    if (this.offset >= this.#bytes.length) {
      throw new Error('CMO3 archive ended unexpectedly')
    }
    const value = this.#bytes[this.offset]! ^ (key & 0xff)
    this.offset += 1
    return value
  }

  readInteger(key = 0): number {
    if (this.offset + 4 > this.#bytes.length) {
      throw new Error('CMO3 archive ended unexpectedly')
    }
    const value = this.#view.getInt32(this.offset, false) ^ key
    this.offset += 4
    return value
  }

  readLong(key = 0): number {
    if (this.offset + 8 > this.#bytes.length) {
      throw new Error('CMO3 archive ended unexpectedly')
    }
    const upper = this.#view.getUint32(this.offset, false)
    const lower = this.#view.getUint32(this.offset + 4, false)
    this.offset += 8
    const mask = key < 0 ? 0xffffffff : key >>> 0
    const decodedUpper = upper ^ mask
    const decodedLower = lower ^ (key >>> 0)
    const value = decodedUpper * 0x1_0000_0000 + decodedLower
    if (!Number.isSafeInteger(value)) {
      throw new Error('CMO3 archive offset exceeds the supported range')
    }
    return value
  }

  readLength(key: number): number {
    let value = 0
    for (let index = 0; index < 4; index += 1) {
      const byte = this.readByte(key)
      value = (value << 7) | (byte & 0x7f)
      if ((byte & 0x80) === 0) {
        return value
      }
    }
    throw new Error('CMO3 archive has an invalid string length')
  }

  readString(key: number): string {
    const length = this.readLength(key)
    return new TextDecoder('utf-8', {fatal: true}).decode(this.readBytes(length, key))
  }

  readBytes(length: number, key: number): Uint8Array {
    if (length < 0 || length > MAXIMUM_ENTRY_BYTES || this.offset + length > this.#bytes.length) {
      throw new Error('CMO3 archive entry is outside the file')
    }
    const result = this.#bytes.slice(this.offset, this.offset + length)
    this.offset += length
    if (key !== 0) {
      result.forEach((byte, index) => {
        result[index] = byte ^ (key & 0xff)
      })
    }
    return result
  }
}

export interface Cmo3Archive {
  readonly entries: ReadonlyMap<string, Uint8Array>
  readonly xml: string
}

export const readCmo3Archive = (source: ArrayBuffer | Uint8Array): Cmo3Archive => {
  const bytes = source instanceof Uint8Array ? source : new Uint8Array(source)
  if (
    bytes.length < HEADER_LENGTH + 4 ||
    new TextDecoder().decode(bytes.subarray(0, 4)) !== 'CAFF'
  ) {
    throw new Error('The selected file is not a CMO3 CAFF archive')
  }
  const header = new ArchiveCursor(bytes, 14)
  const key = header.readInteger()
  const cursor = new ArchiveCursor(bytes, HEADER_LENGTH)
  const count = cursor.readInteger(key)
  if (count < 1 || count > MAXIMUM_ENTRY_COUNT) {
    throw new Error('CMO3 archive has an invalid entry count')
  }

  const descriptors = Array.from({length: count}, () => {
    const path = cursor.readString(key)
    const tag = cursor.readString(key)
    const start = cursor.readLong(key)
    const size = cursor.readInteger(key)
    const obfuscated = cursor.readByte(key) !== 0
    const compression = cursor.readByte(key)
    cursor.offset += 8
    return {compression, obfuscated, path, size, start, tag}
  })

  const entries = new Map<string, Uint8Array>()
  let totalBytes = 0
  for (const descriptor of descriptors) {
    const item = new ArchiveCursor(bytes, descriptor.start)
    const stored = item.readBytes(descriptor.size, descriptor.obfuscated ? key : 0)
    let contents: Uint8Array
    if (descriptor.compression === 16) {
      contents = stored
    } else if (descriptor.compression === 33 || descriptor.compression === 37) {
      contents = unzipEntry(stored, descriptor.path)
    } else {
      throw new Error(`CMO3 archive uses unsupported compression ${descriptor.compression}`)
    }
    totalBytes += contents.length
    if (totalBytes > MAXIMUM_ARCHIVE_BYTES) {
      throw new Error('CMO3 archive exceeds the supported total size')
    }
    entries.set(descriptor.path, contents)
  }

  const xml = descriptors.find((descriptor) => descriptor.tag === 'main_xml')
  const xmlBytes = xml === undefined ? undefined : entries.get(xml.path)
  if (xmlBytes === undefined) {
    throw new Error('CMO3 archive has no main model definition')
  }
  return {entries, xml: new TextDecoder('utf-8', {fatal: true}).decode(xmlBytes)}
}
