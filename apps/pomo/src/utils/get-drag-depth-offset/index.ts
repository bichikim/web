import {clamp} from 'es-toolkit/math'

const DRAG_RANGE_RATIO = 0.35

export interface DragDepthOffsetOptions {
  readonly startOffset: number
  readonly distance: number
  readonly extent: number
}

/** 공통 이동 범위를 기준으로 드래그 거리를 제한된 깊이 오프셋으로 변환한다. */
export const getDragDepthOffset = (options: DragDepthOffsetOptions): number =>
  clamp(options.startOffset - options.distance / options.extent / DRAG_RANGE_RATIO, -1, 1)
