const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const HEADER_CHARACTERS = 44
const BASE64_BLOCK = 4
const NIBBLE = 16
const SIX_BITS = 64
const PNG_SIGNATURE = '\u0089PNG\r\n\u001a\n'
const PNG_HEADER_BYTES = 24
const PNG_TYPE_OFFSET = 12
const PNG_WIDTH_OFFSET = 16
const PNG_HEIGHT_OFFSET = 20
const GIF_HEADER_BYTES = 10
const GIF_SIGNATURE_BYTES = 6
const GIF_HEIGHT_OFFSET = 8
const text = (bytes) => String.fromCharCode(...bytes)
const decodeBlock = (block) => {
  const values = Array.from(block, (character) => Math.max(0, BASE64.indexOf(character)))
  return [
    values[0] * BASE64_BLOCK + Math.floor(values[1] / NIBBLE),
    (values[1] % NIBBLE) * NIBBLE + Math.floor(values[2] / BASE64_BLOCK),
    (values[2] % BASE64_BLOCK) * SIX_BITS + values[3],
  ]
}
/** Reads PNG/GIF dimensions from a bounded data URI header without decoding image pixels. */
export function imageSize(uri) {
  const start = uri.indexOf(',') + 1
  const encoded = uri.slice(start, start + HEADER_CHARACTERS)
  const bytes = Uint8Array.from(
    Array.from({length: Math.floor(encoded.length / BASE64_BLOCK)}, (_, index) =>
      decodeBlock(encoded.slice(index * BASE64_BLOCK, (index + 1) * BASE64_BLOCK)),
    ).flat(),
  )
  const header = new DataView(bytes.buffer)
  let width
  let height
  if (
    bytes.length >= PNG_HEADER_BYTES &&
    text(bytes.slice(0, PNG_SIGNATURE.length)) === PNG_SIGNATURE &&
    text(bytes.slice(PNG_TYPE_OFFSET, PNG_WIDTH_OFFSET)) === 'IHDR'
  ) {
    width = header.getUint32(PNG_WIDTH_OFFSET)
    height = header.getUint32(PNG_HEIGHT_OFFSET)
  } else if (
    bytes.length >= GIF_HEADER_BYTES &&
    /^GIF8[79]a$/u.test(text(bytes.slice(0, GIF_SIGNATURE_BYTES)))
  ) {
    width = header.getUint16(GIF_SIGNATURE_BYTES, true)
    height = header.getUint16(GIF_HEIGHT_OFFSET, true)
  }
  return width > 0 && height > 0 ? {height, width} : undefined
}
