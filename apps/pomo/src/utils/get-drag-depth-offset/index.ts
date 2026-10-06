import {clamp} from 'es-toolkit/math'

const DRAG_RANGE_RATIO = 0.35

export interface DragDepthOffsetOptions {
  readonly startOffset: number
  readonly distance: number
  readonly extent: number
}

/** Maps drag distance to a bounded depth offset with the shared motion range. */
export const getDragDepthOffset = (options: DragDepthOffsetOptions): number =>
  clamp(options.startOffset - options.distance / options.extent / DRAG_RANGE_RATIO, -1, 1)
