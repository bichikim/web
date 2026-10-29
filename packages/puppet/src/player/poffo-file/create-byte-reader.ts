/** A bounded little-endian reader over borrowed metadata bytes. */
export const createByteReader = (bytes: Uint8Array) => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let offset = 0
  const take = (length: number) => {
    if (length > bytes.length - offset) {
      throw new SyntaxError('Truncated Poffo value')
    }
    const position = offset
    offset += length
    return position
  }
  return {
    byte: () => view.getUint8(take(1)),
    bytes(length: number) {
      const position = take(length)
      return bytes.subarray(position, position + length)
    },
    ended: () => offset === bytes.length,
    float32: () => view.getFloat32(take(Float32Array.BYTES_PER_ELEMENT), true),
    float64: () => view.getFloat64(take(Float64Array.BYTES_PER_ELEMENT), true),
    int32: () => view.getInt32(take(Int32Array.BYTES_PER_ELEMENT), true),
    length(minimumBytes: number) {
      const length = view.getUint32(take(Uint32Array.BYTES_PER_ELEMENT), true)
      if (length > (bytes.length - offset) / minimumBytes) {
        throw new SyntaxError('Invalid Poffo value length')
      }
      return length
    },
    uint16: () => view.getUint16(take(Uint16Array.BYTES_PER_ELEMENT), true),
    uint32: () => view.getUint32(take(Uint32Array.BYTES_PER_ELEMENT), true),
  }
}
