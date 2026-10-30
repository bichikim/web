/** Independent chunks must end on a three-byte boundary so only the final chunk has padding. */
const BASE64_CHUNK_BYTES = 24_576

/** 바이트를 브라우저와 Node에서 같은 Base64 문자열로 인코딩한다. */
export const encodeBase64 = (bytes: Uint8Array): string => {
  const native: unknown = Reflect.get(bytes, 'toBase64')
  if (typeof native === 'function') {
    const encoded: unknown = Reflect.apply(native, bytes, [])
    if (typeof encoded !== 'string') {
      throw new TypeError('Invalid native Base64 output')
    }
    return encoded
  }
  const chunks: string[] = []
  for (let offset = 0; offset < bytes.length; offset += BASE64_CHUNK_BYTES) {
    const chunk = bytes.subarray(offset, offset + BASE64_CHUNK_BYTES)
    chunks.push(btoa(Reflect.apply(String.fromCharCode, undefined, chunk)))
  }
  return chunks.join('')
}
