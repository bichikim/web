export type PointerGestureAxis = 'horizontal' | 'pending' | 'vertical'
export interface ResolvePointerGestureAxisOptions {
  readonly axis: PointerGestureAxis
  readonly horizontalDistance: number
  readonly verticalDistance: number
  readonly intentDistance: number
}
/** Resolves a pending pointer axis, retaining its established direction and vertical ties. */
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
