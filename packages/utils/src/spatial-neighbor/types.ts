/** x, y, w, h bounding box */
export interface Box {
  readonly h: number
  readonly w: number
  readonly x: number
  readonly y: number
}

/** 계산용 박스. 변 좌표와 중심(cx, cy)을 포함한다. */
export interface NormalizedBox {
  readonly bottom: number
  readonly cx: number
  readonly cy: number
  readonly left: number
  readonly right: number
  readonly top: number
}

/** 화살표 이동 방향 */
export type Direction = 'down' | 'left' | 'right' | 'up'

/** spatial-neighbor 탐색 옵션 */
export interface SpatialNeighborOptions {
  /**
   * 보조축/주축 비율 상한. 값이 작을수록 대각선 후보를 더 많이 제외한다.
   * @default 0.5
   */
  readonly angleLimit?: number
  /**
   * true면 이동 축에 수직인 축에서 겹치는 대상만 후보로 본다.
   * @default true
   */
  readonly requireOverlap?: boolean
}

/** {@link SpatialNeighborOptions} 기본값 */
export const defaultSpatialNeighborOptions = {
  angleLimit: 0.5,
  requireOverlap: true,
} as const satisfies Required<SpatialNeighborOptions>
