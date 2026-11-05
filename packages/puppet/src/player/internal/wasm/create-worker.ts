import type {BufferRequest, BufferResponse} from '../../buffering/types'

const encode = (_key: string, value: unknown): unknown => {
  if (value instanceof Map) {
    return {__poffoMap: [...value]}
  }
  if (ArrayBuffer.isView(value)) {
    if (value instanceof DataView) {
      throw new TypeError('DataView is not a playback sample buffer')
    }
    return {
      __poffoTyped:
        value instanceof Float32Array
          ? Array.from(value)
          : Array.from(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)),
    }
  }
  if (value instanceof ArrayBuffer) {
    return undefined
  }
  if (value === undefined) {
    return {__poffoUndefined: true}
  }
  return Object.is(value, -0) ? {__poffoNumber: '-0'} : value
}
const isEntries = (value: unknown): value is ReadonlyArray<readonly [unknown, unknown]> =>
  Array.isArray(value) &&
  value.every((entry: unknown) => Array.isArray(entry) && entry.length === 2)
const decode = (_key: string, value: unknown): unknown => {
  if (typeof value === 'object' && value !== null) {
    if ('__poffoMap' in value && isEntries(value.__poffoMap)) {
      return new Map(value.__poffoMap)
    }
    if ('__poffoUndefined' in value) {
      return undefined
    }
    if ('__poffoNumber' in value && value.__poffoNumber === '-0') {
      return -0
    }
  }
  return value
}

/** Owns one Wasm runtime. JavaScript only transports messages and linear-memory buffers. */
export const createWasmWorker = (instance: WebAssembly.Instance) => {
  const {exports} = instance
  const {memory} = exports
  if (!(memory instanceof WebAssembly.Memory)) {
    throw new TypeError('Playback module has no linear memory')
  }
  const invoke = (name: string, ...args: number[]): number => {
    const operation = exports[name]
    if (typeof operation !== 'function') {
      throw new TypeError(`Playback module has no ${name} operation`)
    }
    return Number(operation(...args))
  }
  let destroyed = false
  const handle = invoke('worker_new')
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()
  return {
    destroy() {
      if (!destroyed) {
        destroyed = true
        invoke('worker_drop', handle)
      }
    },
    process(message: BufferRequest): BufferResponse {
      if (destroyed) {
        throw new Error('Playback runtime was destroyed')
      }
      const MINIMUM_PACKED_LENGTH = 32
      let arrayIndex = 0
      const transport = (_key: string, value: unknown): unknown => {
        const numeric =
          value instanceof Float32Array ||
          (Array.isArray(value) &&
            value.length >= MINIMUM_PACKED_LENGTH &&
            value.every((entry: unknown) => typeof entry === 'number'))
        if (numeric) {
          const index = arrayIndex
          arrayIndex += 1
          const pointer = invoke('worker_array', handle, index, value.length)
          new Float64Array(memory.buffer, pointer, value.length).set(value)
          return {__poffoArray: index}
        }
        return encode(_key, value)
      }
      const bytes = encoder.encode(JSON.stringify(message, transport))
      const input = invoke('worker_input', handle, bytes.length)
      new Uint8Array(memory.buffer, input, bytes.length).set(bytes)
      invoke('worker_process', handle)
      const output = invoke('worker_output', handle)
      const length = invoke('worker_output_length', handle)
      const undefinedFields: Array<readonly [object, string]> = []
      const response: BufferResponse = JSON.parse(
        decoder.decode(new Uint8Array(memory.buffer, output, length)),
        function revive(this: unknown, key: string, value: unknown) {
          const decoded = decode(key, value)
          if (decoded === undefined && typeof this === 'object' && this !== null) {
            undefinedFields.push([this, key])
          }
          return decoded
        },
      )
      // JSON.parse removes undefined fields; checkpoints retain their explicitly undefined keys.
      for (const [target, key] of undefinedFields) {
        Object.defineProperty(target, key, {
          configurable: true,
          enumerable: true,
          value: undefined,
          writable: true,
        })
      }
      if (response.kind === 'produced' && message.kind === 'produce') {
        if (response.frame.kind === 'stale') {
          return {...response, frame: {...response.frame, buffer: message.request.buffer}}
        }
        const vertices = new Float32Array(message.request.buffer)
        vertices.set(
          new Float32Array(
            memory.buffer,
            invoke('worker_vertices', handle),
            invoke('worker_vertices_length', handle),
          ),
        )
        return {
          ...response,
          frame: {...response.frame, computed: {...response.frame.computed, vertices}},
        }
      }
      return response
    },
  }
}
