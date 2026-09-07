export interface FoldPoint {
  readonly x: number
  readonly y: number
}

export interface PageFold {
  readonly creaseDirection: FoldPoint
  readonly creaseMidpoint: FoldPoint
  readonly flap: ReadonlyArray<FoldPoint>
  readonly flatPage: ReadonlyArray<FoldPoint>
  readonly matrix: readonly [number, number, number, number, number, number]
  readonly progress: number
}

interface FoldTargetOptions {
  readonly anchor: FoldPoint
  readonly height: number
  readonly target: FoldPoint
}

interface PageFoldOptions extends FoldTargetOptions {
  readonly width: number
}

interface PageFoldCompletionOptions {
  readonly anchorX: number
  readonly progress: number
  readonly swiping: boolean
  readonly threshold?: number
  readonly velocityX: number
}

const FOLD_REST_DISTANCE = 2
const HALF_PLANE_TOLERANCE = -1e-9
const CLAMP_ITERATIONS = 3
const REFLECTION_FACTOR = -2
const PERCENT = 100
const DEFAULT_COMPLETION_THRESHOLD = 50

const limitPointToCircle = (center: FoldPoint, radius: number, point: FoldPoint): FoldPoint => {
  const horizontalDistance = point.x - center.x
  const verticalDistance = point.y - center.y
  const distance = Math.hypot(horizontalDistance, verticalDistance)

  if (distance <= radius || distance === 0) {
    return point
  }

  return {
    x: center.x + (horizontalDistance / distance) * radius,
    y: center.y + (verticalDistance / distance) * radius,
  }
}

const clipToHalfPlane = (
  polygon: ReadonlyArray<FoldPoint>,
  pointOnLine: FoldPoint,
  lineDirection: FoldPoint,
  referencePoint: FoldPoint,
): ReadonlyArray<FoldPoint> => {
  const normal = {x: -lineDirection.y, y: lineDirection.x}
  const signedSide = (point: FoldPoint) =>
    normal.x * (point.x - pointOnLine.x) + normal.y * (point.y - pointOnLine.y)
  const desiredSide = Math.sign(signedSide(referencePoint)) || 1
  const isInside = (point: FoldPoint) => signedSide(point) * desiredSide >= HALF_PLANE_TOLERANCE
  const result: Array<FoldPoint> = []

  for (let index = 0; index < polygon.length; index += 1) {
    const start = polygon[index]
    const end = polygon[(index + 1) % polygon.length]

    if (start !== undefined && end !== undefined) {
      const startInside = isInside(start)
      const endInside = isInside(end)

      if (startInside) {
        result.push(start)
      }

      if (startInside !== endInside) {
        const startSide = signedSide(start)
        const endSide = signedSide(end)
        const distanceRatio = startSide / (startSide - endSide)
        result.push({
          x: start.x + distanceRatio * (end.x - start.x),
          y: start.y + distanceRatio * (end.y - start.y),
        })
      }
    }
  }

  return result
}

export const clampFoldTarget = (options: FoldTargetOptions): FoldPoint => {
  const topSpine = {x: 0, y: 0}
  const bottomSpine = {x: 0, y: options.height}
  const topRadius = Math.hypot(options.anchor.x, options.anchor.y)
  const bottomRadius = Math.hypot(options.anchor.x, options.anchor.y - options.height)
  let {target} = options

  for (let iteration = 0; iteration < CLAMP_ITERATIONS; iteration += 1) {
    target = limitPointToCircle(topSpine, topRadius, target)
    target = limitPointToCircle(bottomSpine, bottomRadius, target)
  }

  return target
}

/** Computes the visible flat and reflected regions of a page from its grabbed edge. */
export const computePageFold = (options: PageFoldOptions): PageFold | null => {
  const target = clampFoldTarget(options)
  const horizontalDistance = target.x - options.anchor.x
  const verticalDistance = target.y - options.anchor.y
  const distance = Math.hypot(horizontalDistance, verticalDistance)

  if (distance < FOLD_REST_DISTANCE) {
    return null
  }

  const dragDirection = {
    x: horizontalDistance / distance,
    y: verticalDistance / distance,
  }
  const creaseMidpoint = {
    x: (options.anchor.x + target.x) / 2,
    y: (options.anchor.y + target.y) / 2,
  }
  const creaseDirection = {x: -dragDirection.y, y: dragDirection.x}
  const pageRectangle: ReadonlyArray<FoldPoint> = [
    {x: Math.min(0, options.anchor.x), y: 0},
    {x: Math.max(0, options.anchor.x), y: 0},
    {x: Math.max(0, options.anchor.x), y: options.height},
    {x: Math.min(0, options.anchor.x), y: options.height},
  ]
  const flatReference = {
    x: creaseMidpoint.x + dragDirection.x,
    y: creaseMidpoint.y + dragDirection.y,
  }
  const distanceFromOrigin = dragDirection.x * creaseMidpoint.x + dragDirection.y * creaseMidpoint.y

  return {
    creaseDirection,
    creaseMidpoint,
    flap: clipToHalfPlane(pageRectangle, creaseMidpoint, creaseDirection, options.anchor),
    flatPage: clipToHalfPlane(pageRectangle, creaseMidpoint, creaseDirection, flatReference),
    matrix: [
      1 - 2 * dragDirection.x * dragDirection.x,
      REFLECTION_FACTOR * dragDirection.x * dragDirection.y,
      REFLECTION_FACTOR * dragDirection.x * dragDirection.y,
      1 - 2 * dragDirection.y * dragDirection.y,
      2 * distanceFromOrigin * dragDirection.x,
      2 * distanceFromOrigin * dragDirection.y,
    ],
    progress: Math.max(
      0,
      Math.min(PERCENT, (Math.abs(options.anchor.x - target.x) / (2 * options.width)) * PERCENT),
    ),
  }
}

export const shouldCompletePageFold = (options: PageFoldCompletionOptions) =>
  options.progress >= (options.threshold ?? DEFAULT_COMPLETION_THRESHOLD) ||
  (options.swiping && options.velocityX * options.anchorX < 0)

export const pointsToCssPolygon = (points: ReadonlyArray<FoldPoint>, horizontalOffset: number) =>
  `polygon(${points.map((point) => `${point.x + horizontalOffset}px ${point.y}px`).join(', ')})`
