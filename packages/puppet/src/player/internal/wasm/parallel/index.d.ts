/* tslint:disable */
/* eslint-disable */

export function initThreadPool(num_threads: number): Promise<any>

export class wbg_rayon_PoolBuilder {
  private constructor()
  free(): void
  [Symbol.dispose](): void
  build(): void
  numThreads(): number
  receiver(): number
}

export function wbg_rayon_start_worker(receiver: number): void

export function worker_thread_count(): number

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module

export interface InitOutput {
  readonly worker_array: (a: number, b: number, c: number) => number
  readonly worker_cache_geometry: (a: number, b: number, c: number) => number
  readonly worker_drop: (a: number) => void
  readonly worker_finish_geometry: (a: number, b: number, c: number) => number
  readonly worker_geometry_commands: (a: number) => number
  readonly worker_geometry_commands_length: (a: number) => number
  readonly worker_geometry_corrections: (a: number, b: number, c: number) => number
  readonly worker_geometry_input: (a: number, b: number) => number
  readonly worker_geometry_layout: (a: number) => number
  readonly worker_geometry_layout_length: (a: number) => number
  readonly worker_geometry_length: (a: number, b: number) => number
  readonly worker_geometry_output: (a: number, b: number) => number
  readonly worker_geometry_packet: (a: number, b: number) => number
  readonly worker_geometry_packet_length: (a: number, b: number) => number
  readonly worker_geometry_pending: (a: number) => number
  readonly worker_geometry_take: (a: number) => number
  readonly worker_geometry_values: (a: number) => number
  readonly worker_geometry_values_length: (a: number) => number
  readonly worker_initialize_section: (a: number, b: number, c: number) => void
  readonly worker_input: (a: number, b: number) => number
  readonly worker_layers: (a: number) => number
  readonly worker_layers_length: (a: number) => number
  readonly worker_new: () => number
  readonly worker_output: (a: number) => number
  readonly worker_output_length: (a: number) => number
  readonly worker_parts: (a: number) => number
  readonly worker_parts_length: (a: number) => number
  readonly worker_process: (a: number) => void
  readonly worker_vertices: (a: number) => number
  readonly worker_vertices_length: (a: number) => number
  readonly __wbg_wbg_rayon_poolbuilder_free: (a: number, b: number) => void
  readonly initThreadPool: (a: number) => any
  readonly wbg_rayon_poolbuilder_build: (a: number) => void
  readonly wbg_rayon_poolbuilder_numThreads: (a: number) => number
  readonly wbg_rayon_poolbuilder_receiver: (a: number) => number
  readonly wbg_rayon_start_worker: (a: number) => void
  readonly worker_thread_count: () => number
  readonly memory: WebAssembly.Memory
  readonly __externref_table_alloc: () => number
  readonly __wbindgen_externrefs: WebAssembly.Table
  readonly __wbindgen_thread_destroy: (a?: number, b?: number, c?: number) => void
  readonly __wbindgen_start: (a: number) => void
}

export type SyncInitInput = BufferSource | WebAssembly.Module

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput, memory?: WebAssembly.Memory, thread_stack_size?: number }} module - Passing `SyncInitInput` directly is deprecated.
 * @param {WebAssembly.Memory} memory - Deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(
  module:
    | {module: SyncInitInput; memory?: WebAssembly.Memory; thread_stack_size?: number}
    | SyncInitInput,
  memory?: WebAssembly.Memory,
): InitOutput

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput>, memory?: WebAssembly.Memory, thread_stack_size?: number }} module_or_path - Passing `InitInput` directly is deprecated.
 * @param {WebAssembly.Memory} memory - Deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init(
  module_or_path?:
    | {
        module_or_path: InitInput | Promise<InitInput>
        memory?: WebAssembly.Memory
        thread_stack_size?: number
      }
    | InitInput
    | Promise<InitInput>,
  memory?: WebAssembly.Memory,
): Promise<InitOutput>
