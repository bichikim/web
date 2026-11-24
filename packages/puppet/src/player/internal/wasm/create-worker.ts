import type {
  BufferRequest,
  BufferResponse,
  PackedBufferResponse,
  WasmBufferRequest,
} from '../../buffering/types'
import {createWasmGeometry, type WasmGeometry} from './create-wasm-geometry'
import {createDecoder} from '../../buffering/render-frame/create-decoder'

import {decodeWorkerResponse, encodeWorkerValue} from '../../buffering/worker-wire'

export interface WasmWorker {
  /** Number of CPU pool threads sharing this heap; omitted, evaluation is serial. */
  readonly threads?: number

  readonly geometry?: WasmGeometry
  readonly initializeSection?: (
    id: number,
    source: ArrayBuffer,
    deferGeometry: boolean,
  ) => PackedBufferResponse
  /** Releases the owned native runtime once. */
  readonly destroy: () => void
  /** Restores the ordinary render-frame representation for legacy consumers. */
  readonly process: (message: BufferRequest) => BufferResponse
  /** Returns ordered replacement templates and owned f64 buffers; use one representation until reinitialization. */
  readonly processPacked: (message: WasmBufferRequest) => PackedBufferResponse
}

/** Owns one Wasm runtime. JavaScript only transports messages and linear-memory buffers. */
export const createWasmWorker = (instance: WebAssembly.Instance): WasmWorker => {
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
  let outputBytes = new Uint8Array()
  let decodeFrame = createDecoder()
  const processPacked = (message: WasmBufferRequest): PackedBufferResponse => {
    if (message.kind === 'initialize') {
      decodeFrame = createDecoder()
    }
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
        return {__poffoArray: [index]}
      }
      return encodeWorkerValue(_key, value)
    }
    const bytes = encoder.encode(JSON.stringify(message, transport))
    const input = invoke('worker_input', handle, bytes.length)
    new Uint8Array(memory.buffer, input, bytes.length).set(bytes)
    invoke('worker_process', handle)
    const output = invoke('worker_output', handle)
    const length = invoke('worker_output_length', handle)
    const shared = !(memory.buffer instanceof ArrayBuffer)
    if (shared && outputBytes.length < length) {
      outputBytes = new Uint8Array(length * 2)
    }
    const view = new Uint8Array(memory.buffer, output, length)
    if (shared) {
      outputBytes.set(view)
    }
    const response = decodeWorkerResponse(decoder.decode(shared ? outputBytes.subarray(0, length) : view))
    if (response.kind === 'error') {
      return {...response, id: message.id}
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
      const readValues = (name: string) =>
        new Float64Array(
          memory.buffer,
          invoke(`worker_${name}`, handle),
          invoke(`worker_${name}_length`, handle),
        ).slice()
      const frame = {
        ...response.frame.computed.frame,
        layers: readValues('layers'),
        parts: readValues('parts'),
      }
      return {
        ...response,
        frame: {...response.frame, computed: {...response.frame.computed, frame, vertices}},
      }
    }
    return response
  }
  return {
    destroy() {
      if (!destroyed) {
        destroyed = true
        invoke('worker_drop', handle)
      }
    },
    geometry:
      typeof exports.worker_geometry_pending === 'function'
        ? createWasmGeometry({destroyed: () => destroyed, handle, invoke, memory})
        : undefined,
    initializeSection(id, source, deferGeometry) {
      if (destroyed) {
        throw new Error('Playback runtime was destroyed')
      }
      decodeFrame = createDecoder()
      const input = invoke('worker_input', handle, source.byteLength)
      new Uint8Array(memory.buffer, input, source.byteLength).set(new Uint8Array(source))
      invoke('worker_initialize_section', handle, id, Number(deferGeometry))
      const output = invoke('worker_output', handle)
      const length = invoke('worker_output_length', handle)
      return JSON.parse(decoder.decode(new Uint8Array(memory.buffer, output, length).slice()))
    },
    process(message: BufferRequest): BufferResponse {
      const response = processPacked(message)
      if (response.kind !== 'produced') {
        return response
      }
      if (response.frame.kind === 'stale') {
        return {...response, frame: response.frame}
      }
      const frame = {...response.frame.computed, frame: decodeFrame(response.frame.computed.frame)}
      return {...response, frame: {...response.frame, computed: frame}}
    },
    processPacked,
  }
}
