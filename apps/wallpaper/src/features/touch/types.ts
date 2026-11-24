import type {TrackingParameter} from '../tracking/types'

export interface TouchParameter extends TrackingParameter {
  readonly joint?: boolean
  readonly axis: 'x' | 'y' | 'z'
  readonly dimensions: number
  readonly parts: readonly string[]
}
export interface TouchHandlers {
  readonly start: (event: PointerEvent) => void
  readonly move: (event: PointerEvent) => void
  readonly finish: (event: PointerEvent) => void
  readonly cancel: () => void
  readonly lostCapture: () => void
}
export interface TouchPoint {
  readonly x: number
  readonly y: number
}
