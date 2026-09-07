const CUBIC_DEGREE = 3
const COORDINATES = 2

export interface MoveCurveHandlesOptions {
  readonly controlPoints: ReadonlyArray<number>
  readonly pointIndex: number
  readonly offsetX: number
  readonly offsetY: number
}

export const moveCurveHandles = (options: MoveCurveHandlesOptions) => {
  const points = [...options.controlPoints]
  if (options.pointIndex % CUBIC_DEGREE === 0) {
    for (const neighbor of [options.pointIndex - 1, options.pointIndex + 1]) {
      if (neighbor >= 0 && neighbor < points.length / COORDINATES) {
        points[neighbor * COORDINATES]! += options.offsetX
        points[neighbor * COORDINATES + 1]! += options.offsetY
      }
    }
  }
  return points
}
