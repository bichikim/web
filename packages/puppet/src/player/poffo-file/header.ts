import type {PoffoHeader} from './types'

export const POFFO_HEADER_BYTES = 64
export const POFFO_MIME_TYPE = 'application/vnd.poffo'
const MAGIC = new TextEncoder().encode('POFFO\r\n\u001a')
export const POFFO_SIGNATURE_BYTES = MAGIC.length
const VERSION = 1
const UINT32_MAXIMUM = 4_294_967_295

/** Whether the prefix identifies the web Poffo container, independent of its filename. */
export const isPoffoFile = (bytes: Uint8Array): boolean =>
  bytes.length >= MAGIC.length && MAGIC.every((value, index) => bytes[index] === value)

/** Header fields use little-endian integers; v1 has no enabled flags. */
export const encodeHeader = (header: PoffoHeader): Uint8Array<ArrayBuffer> => {
  const fields = [
    header.indexLength,
    header.codec,
    header.encodedLength,
    header.decodedLength,
    header.assetCount,
  ]
  if (!fields.every((value) => Number.isInteger(value) && value >= 0 && value <= UINT32_MAXIMUM)) {
    throw new RangeError('Poffo v1 field exceeds uint32')
  }
  const bytes = new Uint8Array(POFFO_HEADER_BYTES)
  if (header.indexHash.length !== POFFO_HEADER_BYTES / 2) {
    throw new RangeError('Invalid Poffo index hash')
  }
  bytes.set(header.indexHash, POFFO_HEADER_BYTES / 2)
  bytes.set(MAGIC)
  const view = new DataView(bytes.buffer)
  const VERSION_OFFSET = 8
  const FIELDS_OFFSET = 12
  view.setUint16(VERSION_OFFSET, VERSION, true)
  fields.forEach((value, index) =>
    view.setUint32(FIELDS_OFFSET + index * Uint32Array.BYTES_PER_ELEMENT, value, true),
  )
  return bytes
}

/** Rejects unsupported versions, flags and codecs before reading variable-length sections. */
export const decodeHeader = (bytes: Uint8Array): PoffoHeader => {
  if (bytes.length !== POFFO_HEADER_BYTES || !isPoffoFile(bytes)) {
    throw new SyntaxError('Not a Poffo v1 file')
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const VERSION_OFFSET = 8
  const FLAGS_OFFSET = 10
  const INDEX_OFFSET = 12
  const CODEC_OFFSET = 16
  const ENCODED_OFFSET = 20
  const DECODED_OFFSET = 24
  const ASSET_COUNT_OFFSET = 28
  if (
    view.getUint16(VERSION_OFFSET, true) !== VERSION ||
    view.getUint16(FLAGS_OFFSET, true) !== 0
  ) {
    throw new SyntaxError('Unsupported Poffo version or flags')
  }
  const codec = view.getUint32(CODEC_OFFSET, true)
  if (codec !== 0 && codec !== 1) {
    throw new SyntaxError('Unsupported Poffo metadata codec')
  }
  return {
    assetCount: view.getUint32(ASSET_COUNT_OFFSET, true),
    codec,
    decodedLength: view.getUint32(DECODED_OFFSET, true),
    encodedLength: view.getUint32(ENCODED_OFFSET, true),
    indexHash: new Uint8Array(bytes.slice(POFFO_HEADER_BYTES / 2)),
    indexLength: view.getUint32(INDEX_OFFSET, true),
  }
}
