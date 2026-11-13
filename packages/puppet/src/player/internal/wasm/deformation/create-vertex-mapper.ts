interface VertexMapperOptions {
  /** Instance-owned memory; a later allocation may replace its backing buffer. */
  readonly memory: WebAssembly.Memory
  /** Allocates zero-initialized Float64 coordinates and returns their byte address. */
  readonly reserve: (length: number) => number
  /** Maps the padded XY input and its cache into the output plane. */
  readonly mapVertices: (buffer: number, length: number, changed: boolean) => void
  /** Current transform revision; changes invalidate cached coordinates. */
  readonly version: () => number
}

/** Retains vertex buffers and views, refreshing views when their memory or size changes. */
export const createVertexMapper = (options: VertexMapperOptions) => {
  const VERTEX_BUFFERS = 3
  const CELL_FIELDS = 4
  let length = -1
  let capacity = 0
  let buffer = 0
  let previousVersion = -1
  let input: Float64Array | undefined
  let result: Float64Array | undefined
  return (vertices: Float32Array | number[]) => {
    const padded = vertices.length + (vertices.length % 2)
    const resized = length !== padded
    if (resized) {
      length = padded
      if (length > capacity) {
        // Input, previous input, output and eight Float64 cell fields per XY pair.
        buffer = options.reserve(length * (VERTEX_BUFFERS + CELL_FIELDS))
        capacity = length
      }
    }
    const backing = options.memory.buffer
    if (
      input === undefined ||
      result === undefined ||
      input.buffer !== backing ||
      input.length !== length ||
      result.length !== vertices.length
    ) {
      input = new Float64Array(backing, buffer, length)
      const OUTPUT_OFFSET = Float64Array.BYTES_PER_ELEMENT * 2
      result = new Float64Array(backing, buffer + length * OUTPUT_OFFSET, vertices.length)
    }
    if (resized) {
      const offset = length * VERTEX_BUFFERS * Float64Array.BYTES_PER_ELEMENT
      new Float64Array(backing, buffer + offset, length * CELL_FIELDS).fill(0)
    }
    input.set(vertices)
    if (padded !== vertices.length) {
      input[vertices.length] = 0
    }
    const version = options.version()
    options.mapVertices(buffer, length, resized || previousVersion !== version)
    if (vertices instanceof Float32Array) {
      vertices.set(result)
    } else {
      for (let index = 0; index < vertices.length; index += 1) {
        vertices[index] = result[index]!
      }
    }
    previousVersion = version
  }
}
