export const GEOMETRY_COMMAND_STRIDE = 4

/** Identifies owned geometry in one rendering device, independently of playback generations. */
export interface GeometryToken {
  readonly owner: string
  readonly connection: number
  readonly frame: number
}
export interface GeometryEndpoint {
  readonly owner: string
  readonly connection: number
  readonly port: MessagePort
}
/** The caller releases the lease; `closed` signals loss of the rendering owner. */
export interface GeometryConnection extends GeometryEndpoint {
  readonly closed: Promise<void>
  readonly release: () => void
}
export interface InitializeGeometry {
  readonly kind: 'initialize'
  readonly id: number
  readonly layout: Float64Array
}
export interface GeometryPreparation {
  readonly frame: number
  readonly vertices: Float32Array
  readonly commands: Uint32Array
  readonly values: Float32Array
  readonly plan: Float64Array
}
export interface PrepareGeometry extends GeometryPreparation {
  readonly kind: 'prepare'
  readonly id: number
}
export type GeometryRequest = InitializeGeometry | PrepareGeometry
export interface InitializedGeometry {
  readonly kind: 'initialized'
  readonly id: number
}
export interface PreparedGeometry {
  readonly kind: 'prepared'
  readonly id: number
  /** Offset and length pairs in float coordinates. Omitted for a complete vertex array. */
  readonly ranges?: Uint32Array
  readonly vertices: Float32Array
}
export interface CancelledGeometry {
  readonly kind: 'cancelled'
  readonly id: number
}
export interface FailedGeometry {
  readonly kind: 'error'
  readonly id: number
  readonly message: string
}
export type GeometryResponse =
  | InitializedGeometry
  | PreparedGeometry
  | CancelledGeometry
  | FailedGeometry
export type GeometryCompletion = PreparedGeometry | CancelledGeometry
