const toBase64 = (bytes: Uint8Array): string => {
  const native: unknown = Reflect.get(bytes, 'toBase64')
  if (typeof native === 'function') {
    const result: unknown = Reflect.apply(native, bytes, [])
    if (typeof result !== 'string') {
      throw new TypeError('Invalid native Base64 output')
    }
    return result
  }
  // Multiples of three keep each independently encoded chunk's padding at the end only.
  const CHUNK_BYTES = 24_576
  const parts: string[] = []
  for (let offset = 0; offset < bytes.length; offset += CHUNK_BYTES) {
    parts.push(btoa(String.fromCharCode(...bytes.subarray(offset, offset + CHUNK_BYTES))))
  }
  return parts.join('')
}

const fromBase64 = (source: string): Uint8Array<ArrayBuffer> => {
  const native: unknown = Reflect.get(Uint8Array, 'fromBase64')
  if (typeof native === 'function') {
    const result: unknown = Reflect.apply(native, Uint8Array, [source])
    if (!(result instanceof Uint8Array) || !(result.buffer instanceof ArrayBuffer)) {
      throw new TypeError('Invalid native Base64 output')
    }
    return new Uint8Array(result.buffer, result.byteOffset, result.byteLength)
  }
  const binary = atob(source)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

/** Preserves canonical data URLs byte-for-byte; other strings remain ordinary strings. */
export const decodeAsset = (source: string) => {
  const comma = source.indexOf(',')
  const prefix = source.slice(0, comma + 1)
  if (!/^data:[^,]*;base64,$/iu.test(prefix)) {
    return undefined
  }
  try {
    const payload = source.slice(comma + 1)
    const bytes = fromBase64(payload)
    return toBase64(bytes) === payload ? {bytes, prefix} : undefined
  } catch {
    return undefined
  }
}

/** Recreates an embedded asset without a giant temporary binary string. */
export const encodeAsset = (prefix: string, bytes: Uint8Array): string => prefix + toBase64(bytes)
