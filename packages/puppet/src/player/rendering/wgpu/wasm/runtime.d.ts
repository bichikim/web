/* tslint:disable */
/* eslint-disable */

export class CanvasRenderer {
  private constructor()
  free(): void
  [Symbol.dispose](): void
  static create(
    canvas: any,
    width: number,
    height: number,
    metadata: string,
    samples: number,
    alpha_capture?: boolean | null,
  ): Promise<CanvasRenderer>
  draw(vertices: Float32Array, display: Float32Array): void
  draw_geometry(id: number, display: Float32Array): Float32Array
  enable_geometry(): Promise<void>
  info(): string
  prepare_geometry(
    id: number,
    source: Float32Array,
    commands: Uint32Array,
    values: Float32Array,
    plan: Float64Array,
    finisher: GeometryFinisher,
    is_cancelled: Function,
  ): Promise<Float32Array | undefined>
  release_geometry(id: number): void
  request_alpha(width: number, height: number): void
  resize(width: number, height: number): void
  take_alpha(): Promise<any> | undefined
  texture(image: ImageBitmap): void
  view(x: number, y: number, dx: number, dy: number): void
}

export class GeometryFinisher {
  free(): void
  [Symbol.dispose](): void
  constructor(layout: Float64Array)
}

export class GeometryKernel {
  private constructor()
  free(): void
  [Symbol.dispose](): void
  corrections(): Uint32Array
  static create(): Promise<GeometryKernel>
  evaluate(
    vertices: Float32Array,
    commands: Uint32Array,
    values: Float32Array,
  ): Promise<Float32Array>
  overflow(): boolean
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module

export interface InitOutput {
  readonly memory: WebAssembly.Memory
  readonly __wbg_canvasrenderer_free: (a: number, b: number) => void
  readonly __wbg_geometryfinisher_free: (a: number, b: number) => void
  readonly __wbg_geometrykernel_free: (a: number, b: number) => void
  readonly canvasrenderer_create: (
    a: any,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number,
    g: number,
  ) => any
  readonly canvasrenderer_draw: (
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
  ) => [number, number]
  readonly canvasrenderer_draw_geometry: (
    a: number,
    b: number,
    c: number,
    d: number,
  ) => [number, number, number]
  readonly canvasrenderer_enable_geometry: (a: number) => any
  readonly canvasrenderer_info: (a: number) => [number, number]
  readonly canvasrenderer_prepare_geometry: (
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number,
    g: number,
    h: number,
    i: number,
    j: number,
    k: number,
    l: any,
  ) => any
  readonly canvasrenderer_release_geometry: (a: number, b: number) => void
  readonly canvasrenderer_request_alpha: (a: number, b: number, c: number) => void
  readonly canvasrenderer_resize: (a: number, b: number, c: number) => void
  readonly canvasrenderer_take_alpha: (a: number) => any
  readonly canvasrenderer_texture: (a: number, b: any) => void
  readonly canvasrenderer_view: (a: number, b: number, c: number, d: number, e: number) => void
  readonly geometryfinisher_new: (a: number, b: number) => [number, number, number]
  readonly geometrykernel_corrections: (a: number) => [number, number]
  readonly geometrykernel_create: () => any
  readonly geometrykernel_evaluate: (
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number,
    g: number,
  ) => any
  readonly geometrykernel_overflow: (a: number) => number
  readonly wasm_bindgen__convert__closures_____invoke__h2dc9214a92dd03db: (
    a: number,
    b: number,
    c: any,
    d: any,
  ) => void
  readonly wasm_bindgen__convert__closures_____invoke__hfcfc707035c9d9b4: (
    a: number,
    b: number,
    c: any,
  ) => [number, number]
  readonly wasm_bindgen__convert__closures_____invoke__h57c0a2cc0e63f70f: (
    a: number,
    b: number,
    c: any,
  ) => void
  readonly __wbindgen_malloc: (a: number, b: number) => number
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number
  readonly __wbindgen_exn_store: (a: number) => void
  readonly __externref_table_alloc: () => number
  readonly __wbindgen_externrefs: WebAssembly.Table
  readonly __wbindgen_destroy_closure: (a: number, b: number) => void
  readonly __wbindgen_free: (a: number, b: number, c: number) => void
  readonly __externref_table_dealloc: (a: number) => void
  readonly __wbindgen_start: () => void
}

export type SyncInitInput = BufferSource | WebAssembly.Module

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: {module: SyncInitInput} | SyncInitInput): InitOutput

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init(
  module_or_path?:
    | {module_or_path: InitInput | Promise<InitInput>}
    | InitInput
    | Promise<InitInput>,
): Promise<InitOutput>
