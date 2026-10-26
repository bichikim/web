import {clamp} from 'es-toolkit/math'

const DRAG_RANGE_RATIO = 0.35

export interface DragDepthOffsetOptions {
  /** 드래그를 시작했을 때의 깊이 오프셋. */
  readonly startOffset: number
  /** 시작점에서 이동한 거리. extent와 같은 단위를 사용한다. */
  readonly distance: number
  /** 드래그 영역의 너비 또는 높이. 0보다 큰 값이어야 한다. */
  readonly extent: number
  /** 이동값이 1만큼 변하는 드래그 거리의 요소 크기 대비 비율. 기본값은 0.35이며 0보다 커야 한다. */
  readonly rangeRatio?: number
}

/** 지정한 이동 범위를 기준으로 드래그 거리를 제한된 깊이 오프셋으로 변환한다. */
export const getDragDepthOffset = (options: DragDepthOffsetOptions): number => {
  const {startOffset, distance, extent, rangeRatio = DRAG_RANGE_RATIO} = options
  return clamp(startOffset - distance / extent / rangeRatio, -1, 1)
}
