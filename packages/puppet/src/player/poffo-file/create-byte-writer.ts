/** An owned, chunked little-endian output; finish it once after writing a value. */
export const createByteWriter = () => {
  const CHUNK_BYTES = 1_048_576
  let buffer = new Uint8Array(CHUNK_BYTES)
  let view = new DataView(buffer.buffer)
  let offset = 0
  let byteLength = 0
  const parts: Uint8Array<ArrayBuffer>[] = []
  const flush = () => {
    if (offset > 0) {
      parts.push(buffer.subarray(0, offset))
      buffer = new Uint8Array(CHUNK_BYTES)
      view = new DataView(buffer.buffer)
      offset = 0
    }
  }
  const reserve = (length: number) => {
    if (offset + length > buffer.length) {
      flush()
    }
    const position = offset
    offset += length
    byteLength += length
    return position
  }
  return {
    byte(value: number) {
      const position = reserve(1)
      buffer[position] = value
    },
    bytes(value: Uint8Array<ArrayBuffer>) {
      if (value.length > buffer.length) {
        flush()
        parts.push(value)
        byteLength += value.length
      } else {
        const position = reserve(value.length)
        buffer.set(value, position)
      }
    },
    finish() {
      return {byteLength, parts: offset > 0 ? [...parts, buffer.subarray(0, offset)] : [...parts]}
    },
    float32(value: number) {
      const position = reserve(Float32Array.BYTES_PER_ELEMENT)
      view.setFloat32(position, value, true)
    },
    float64(value: number) {
      const position = reserve(Float64Array.BYTES_PER_ELEMENT)
      view.setFloat64(position, value, true)
    },
    int32(value: number) {
      const position = reserve(Int32Array.BYTES_PER_ELEMENT)
      view.setInt32(position, value, true)
    },
    uint16(value: number) {
      const position = reserve(Uint16Array.BYTES_PER_ELEMENT)
      view.setUint16(position, value, true)
    },
    uint32(value: number) {
      const position = reserve(Uint32Array.BYTES_PER_ELEMENT)
      view.setUint32(position, value, true)
    },
  }
}
