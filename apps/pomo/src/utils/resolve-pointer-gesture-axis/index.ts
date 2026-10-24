export type PointerGestureAxis = 'horizontal' | 'pending' | 'vertical'
export interface ResolvePointerGestureAxisOptions {
  readonly axis: PointerGestureAxis
  readonly horizontalDistance: number
  readonly verticalDistance: number
  readonly intentDistance: number
}
/** 미정인 포인터 축을 결정한다. 이미 정한 방향은 유지하고 거리가 같으면 수직을 선택한다. */
export const resolvePointerGestureAxis = (
  options: ResolvePointerGestureAxisOptions,
): PointerGestureAxis => {
  if (options.axis !== 'pending') {
    return options.axis
  }
  const horizontal = Math.abs(options.horizontalDistance)
  const vertical = Math.abs(options.verticalDistance)
  if (Math.max(horizontal, vertical) < options.intentDistance) {
    return 'pending'
  }
  return horizontal > vertical ? 'horizontal' : 'vertical'
}
