interface GeometryBatch {
  readonly commands: Uint32Array
  readonly id: number
  readonly plan: Float64Array
  readonly values: Float32Array
}
export interface WasmGeometry {
  readonly layout: () => Float64Array
  readonly cache: (id: number, vertices: Float32Array | undefined, ranges?: Uint32Array) => void

  readonly take: () => GeometryBatch | undefined
  readonly finish: (
    id: number,
    vertices: Float32Array,
    corrections: Uint32Array,
    all: boolean,
  ) => void
}
interface GeometryMemory {
  readonly destroyed: () => boolean
  readonly handle: number
  readonly invoke: (name: string, ...args: number[]) => number
  readonly memory: WebAssembly.Memory
}

const copyCachedVertices = (
  target: Float32Array,
  vertices: Float32Array,
  ranges: Uint32Array | undefined,
) => {
  if (ranges === undefined) {
    if (vertices.length !== target.length) {
      throw new Error('Geometry vertex count changed')
    }
    target.set(vertices)
    return
  }
  if (ranges.length % 2 !== 0) {
    throw new Error('Incomplete packed geometry range')
  }
  let count = 0
  for (let index = 0; index < ranges.length; index += 2) {
    const offset = ranges[index]!
    const length = ranges[index + 1]!
    if (offset % 2 !== 0 || length % 2 !== 0 || offset + length > target.length) {
      throw new Error('Invalid packed geometry range')
    }
    count += length
  }
  if (count !== vertices.length) {
    throw new Error('Packed geometry vertex count changed')
  }
  let source = 0
  for (let index = 0; index < ranges.length; index += 2) {
    const length = ranges[index + 1]!
    target.set(vertices.subarray(source, source + length), ranges[index]!)
    source += length
  }
}

/** Borrows the playback heap. Each ticket owns its original frame until completion. */
export const createWasmGeometry = (options: GeometryMemory): WasmGeometry => {
  const {handle, invoke, memory} = options
  return {
    cache(id, vertices, ranges) {
      if (options.destroyed()) {
        throw new Error('Playback runtime was destroyed')
      }
      if (vertices !== undefined) {
        const pointer = invoke('worker_geometry_input', handle, id)
        if (pointer === 0) {
          throw new Error('Unknown geometry frame')
        }
        const length = invoke('worker_geometry_length', handle, id)
        try {
          copyCachedVertices(new Float32Array(memory.buffer, pointer, length), vertices, ranges)
        } catch (cause) {
          invoke('worker_cache_geometry', handle, id, 1)
          throw cause
        }
      }
      if (invoke('worker_cache_geometry', handle, id, Number(vertices === undefined)) !== 1) {
        throw new Error('Geometry cache completion failed')
      }
    },
    finish(id, vertices, corrections, all) {
      if (options.destroyed()) {
        throw new Error('Playback runtime was destroyed')
      }
      if (vertices.length !== invoke('worker_geometry_length', handle, id)) {
        throw new Error('Geometry vertex count changed')
      }
      const flags = invoke('worker_geometry_corrections', handle, id, corrections.length)
      const pointer = invoke('worker_geometry_input', handle, id)
      if (flags === 0 || pointer === 0) {
        throw new Error('Unknown geometry frame')
      }
      new Uint32Array(memory.buffer, flags, corrections.length).set(corrections)
      if (!all) {
        new Float32Array(memory.buffer, pointer, vertices.length).set(vertices)
      }
      if (invoke('worker_finish_geometry', handle, id, Number(all)) !== 1) {
        throw new Error('Geometry completion failed')
      }
      vertices.set(
        new Float32Array(
          memory.buffer,
          invoke('worker_geometry_output', handle, id),
          vertices.length,
        ),
      )
    },
    layout() {
      const pointer = invoke('worker_geometry_layout', handle)
      const length = invoke('worker_geometry_layout_length', handle)
      return new Float64Array(memory.buffer, pointer, length).slice()
    },
    take: () => {
      if (options.destroyed()) {
        throw new Error('Playback runtime was destroyed')
      }
      if (invoke('worker_geometry_pending', handle) === 0) {
        return undefined
      }
      const commands = new Uint32Array(
        memory.buffer,
        invoke('worker_geometry_commands', handle),
        invoke('worker_geometry_commands_length', handle),
      ).slice()
      const values = new Float32Array(
        memory.buffer,
        invoke('worker_geometry_values', handle),
        invoke('worker_geometry_values_length', handle),
      ).slice()
      const id = invoke('worker_geometry_take', handle)
      if (id === 0) {
        throw new Error('Geometry frame capacity was exceeded')
      }
      const pointer = invoke('worker_geometry_packet', handle, id)
      const length = invoke('worker_geometry_packet_length', handle, id)
      const plan = new Float64Array(memory.buffer, pointer, length).slice()
      return {commands, id, plan, values}
    },
  }
}
