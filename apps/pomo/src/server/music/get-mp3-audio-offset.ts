// oxlint-disable no-magic-numbers, eslint/no-bitwise -- ID3 uses fixed binary fields.
const ID3_HEADER_BYTES = 10
const ID3_FOOTER_BYTES = 10
const ID3_FOOTER_FLAG = 0x10

const readSynchsafeInteger = (bytes: Uint8Array, offset: number): number => {
  const first = bytes[offset]
  const second = bytes[offset + 1]
  const third = bytes[offset + 2]
  const fourth = bytes[offset + 3]

  if (
    first === undefined ||
    second === undefined ||
    third === undefined ||
    fourth === undefined ||
    (first | second | third | fourth) > 0x7f
  ) {
    throw new TypeError('invalid_mp3_id3')
  }

  return (first << 21) | (second << 14) | (third << 7) | fourth
}

export const getMp3AudioOffset = (bytes: Uint8Array): number => {
  if (bytes[0] !== 0x49 || bytes[1] !== 0x44 || bytes[2] !== 0x33) {
    return 0
  }

  if (bytes.byteLength < ID3_HEADER_BYTES) {
    throw new TypeError('invalid_mp3_id3')
  }

  const bodyBytes = readSynchsafeInteger(bytes, 6)
  const footerBytes = (bytes[5] & ID3_FOOTER_FLAG) === 0 ? 0 : ID3_FOOTER_BYTES
  const totalBytes = ID3_HEADER_BYTES + bodyBytes + footerBytes

  return totalBytes
}
