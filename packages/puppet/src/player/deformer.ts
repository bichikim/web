import type {
  PuppetDeformerCurveHandle,
  PuppetDocument,
  PuppetPoint,
  PuppetSceneContainerNode,
  PuppetSceneDeformerNode,
  PuppetSceneNode,
} from './document'
import {getDocumentScene} from './scene'

export interface ApplySceneDeformersOptions {
  readonly document: PuppetDocument
  readonly verticesByPartId: ReadonlyMap<string, Float32Array | number[]>
}

export interface UnapplySceneDeformersPointOptions {
  readonly document: PuppetDocument
  readonly partId: string
  readonly point: PuppetPoint
}

export interface TransformSceneNodePointOptions {
  readonly document: PuppetDocument
  readonly nodeId: string
  readonly point: PuppetPoint
}

type PointTransform = (point: PuppetPoint) => PuppetPoint

const COORDINATES_PER_POINT = 2
const GRID_INVERSE_ITERATIONS = 8
const GRID_INVERSE_EPSILON_RATIO = 0.0001
const MINIMUM_DETERMINANT = 0.000_000_1
const BEZIER_TANGENT_MULTIPLIER = 3
const CUBIC_CURVE_WEIGHT = 3
const DOUBLE_CURVE_WEIGHT = 2

export const createDeformerControlPoints = (
  node: Pick<PuppetSceneDeformerNode, 'bounds' | 'columns' | 'rows'>,
) => {
  const points: number[] = []

  for (let row = 0; row <= node.rows; row += 1) {
    for (let column = 0; column <= node.columns; column += 1) {
      points.push(
        node.bounds.x + (node.bounds.width * column) / node.columns,
        node.bounds.y + (node.bounds.height * row) / node.rows,
      )
    }
  }

  return points
}

const getControlPoint = (
  node: PuppetSceneDeformerNode,
  column: number,
  row: number,
): PuppetPoint => {
  const coordinateIndex = (row * (node.columns + 1) + column) * COORDINATES_PER_POINT
  return {
    x: node.controlPoints[coordinateIndex] ?? 0,
    y: node.controlPoints[coordinateIndex + 1] ?? 0,
  }
}

const getPointTangent = (
  previous: PuppetPoint | undefined,
  point: PuppetPoint,
  next: PuppetPoint | undefined,
): PuppetPoint => {
  if (previous !== undefined && next !== undefined) {
    return {x: (next.x - previous.x) / 2, y: (next.y - previous.y) / 2}
  }

  return next === undefined
    ? {x: point.x - (previous?.x ?? point.x), y: point.y - (previous?.y ?? point.y)}
    : {x: next.x - point.x, y: next.y - point.y}
}

export const createDeformerCurveHandle = (
  node: PuppetSceneDeformerNode,
  pointIndex: number,
): PuppetDeformerCurveHandle | undefined => {
  const pointCount = (node.columns + 1) * (node.rows + 1)
  if (!Number.isInteger(pointIndex) || pointIndex < 0 || pointIndex >= pointCount) {
    return undefined
  }

  const column = pointIndex % (node.columns + 1)
  const row = Math.floor(pointIndex / (node.columns + 1))
  const point = getControlPoint(node, column, row)
  const horizontalTangent = getPointTangent(
    column === 0 ? undefined : getControlPoint(node, column - 1, row),
    point,
    column === node.columns ? undefined : getControlPoint(node, column + 1, row),
  )
  const verticalTangent = getPointTangent(
    row === 0 ? undefined : getControlPoint(node, column, row - 1),
    point,
    row === node.rows ? undefined : getControlPoint(node, column, row + 1),
  )

  return {
    horizontal: {
      x: point.x + horizontalTangent.x / BEZIER_TANGENT_MULTIPLIER,
      y: point.y + horizontalTangent.y / BEZIER_TANGENT_MULTIPLIER,
    },
    pointIndex,
    vertical: {
      x: point.x + verticalTangent.x / BEZIER_TANGENT_MULTIPLIER,
      y: point.y + verticalTangent.y / BEZIER_TANGENT_MULTIPLIER,
    },
  }
}

const getCurveHandle = (node: PuppetSceneDeformerNode, pointIndex: number) =>
  node.curveHandles?.find((handle) => handle.pointIndex === pointIndex)

const getAxisTangent = (
  node: PuppetSceneDeformerNode,
  pointIndex: number,
  axis: 'horizontal' | 'vertical',
  fallback: PuppetPoint,
) => {
  const point = getControlPoint(
    node,
    pointIndex % (node.columns + 1),
    Math.floor(pointIndex / (node.columns + 1)),
  )
  const handle = getCurveHandle(node, pointIndex)?.[axis]
  return handle === undefined
    ? fallback
    : {
        x: (handle.x - point.x) * BEZIER_TANGENT_MULTIPLIER,
        y: (handle.y - point.y) * BEZIER_TANGENT_MULTIPLIER,
      }
}

const interpolatePoint = (first: PuppetPoint, second: PuppetPoint, progress: number) => ({
  x: first.x + (second.x - first.x) * progress,
  y: first.y + (second.y - first.y) * progress,
})

interface InterpolateCurveOptions {
  readonly end: PuppetPoint
  readonly endTangent: PuppetPoint
  readonly progress: number
  readonly start: PuppetPoint
  readonly startTangent: PuppetPoint
}

const interpolateCurve = (options: InterpolateCurveOptions): PuppetPoint => {
  const squared = options.progress * options.progress
  const cubed = squared * options.progress
  const startWeight = DOUBLE_CURVE_WEIGHT * cubed - CUBIC_CURVE_WEIGHT * squared + 1
  const startTangentWeight = cubed - DOUBLE_CURVE_WEIGHT * squared + options.progress
  const endWeight = -DOUBLE_CURVE_WEIGHT * cubed + CUBIC_CURVE_WEIGHT * squared
  const endTangentWeight = cubed - squared

  return {
    x:
      options.start.x * startWeight +
      options.startTangent.x * startTangentWeight +
      options.end.x * endWeight +
      options.endTangent.x * endTangentWeight,
    y:
      options.start.y * startWeight +
      options.startTangent.y * startTangentWeight +
      options.end.y * endWeight +
      options.endTangent.y * endTangentWeight,
  }
}

const subtractPoint = (end: PuppetPoint, start: PuppetPoint): PuppetPoint => ({
  x: end.x - start.x,
  y: end.y - start.y,
})

export const transformDeformerPoint = (
  node: PuppetSceneDeformerNode,
  point: PuppetPoint,
): PuppetPoint => {
  const horizontalPosition = ((point.x - node.bounds.x) / node.bounds.width) * node.columns
  const verticalPosition = ((point.y - node.bounds.y) / node.bounds.height) * node.rows
  const column = Math.min(node.columns - 1, Math.max(0, Math.floor(horizontalPosition)))
  const row = Math.min(node.rows - 1, Math.max(0, Math.floor(verticalPosition)))
  const horizontalProgress = horizontalPosition - column
  const verticalProgress = verticalPosition - row
  const topLeft = getControlPoint(node, column, row)
  const topRight = getControlPoint(node, column + 1, row)
  const bottomLeft = getControlPoint(node, column, row + 1)
  const bottomRight = getControlPoint(node, column + 1, row + 1)
  const topLeftIndex = row * (node.columns + 1) + column
  const topRightIndex = topLeftIndex + 1
  const bottomLeftIndex = (row + 1) * (node.columns + 1) + column
  const bottomRightIndex = bottomLeftIndex + 1
  const topDifference = subtractPoint(topRight, topLeft)
  const bottomDifference = subtractPoint(bottomRight, bottomLeft)
  const top = interpolateCurve({
    end: topRight,
    endTangent: getAxisTangent(node, topRightIndex, 'horizontal', topDifference),
    progress: horizontalProgress,
    start: topLeft,
    startTangent: getAxisTangent(node, topLeftIndex, 'horizontal', topDifference),
  })
  const bottom = interpolateCurve({
    end: bottomRight,
    endTangent: getAxisTangent(node, bottomRightIndex, 'horizontal', bottomDifference),
    progress: horizontalProgress,
    start: bottomLeft,
    startTangent: getAxisTangent(node, bottomLeftIndex, 'horizontal', bottomDifference),
  })
  const verticalDifference = subtractPoint(bottom, top)
  const topHasVerticalHandle =
    getCurveHandle(node, topLeftIndex) !== undefined ||
    getCurveHandle(node, topRightIndex) !== undefined
  const bottomHasVerticalHandle =
    getCurveHandle(node, bottomLeftIndex) !== undefined ||
    getCurveHandle(node, bottomRightIndex) !== undefined
  const topTangent = topHasVerticalHandle
    ? interpolatePoint(
        getAxisTangent(node, topLeftIndex, 'vertical', subtractPoint(bottomLeft, topLeft)),
        getAxisTangent(node, topRightIndex, 'vertical', subtractPoint(bottomRight, topRight)),
        horizontalProgress,
      )
    : verticalDifference
  const bottomTangent = bottomHasVerticalHandle
    ? interpolatePoint(
        getAxisTangent(node, bottomLeftIndex, 'vertical', subtractPoint(bottomLeft, topLeft)),
        getAxisTangent(node, bottomRightIndex, 'vertical', subtractPoint(bottomRight, topRight)),
        horizontalProgress,
      )
    : verticalDifference

  return interpolateCurve({
    end: bottom,
    endTangent: bottomTangent,
    progress: verticalProgress,
    start: top,
    startTangent: topTangent,
  })
}

const untransformGridPoint = (node: PuppetSceneDeformerNode, target: PuppetPoint): PuppetPoint => {
  const epsilon = Math.max(node.bounds.width, node.bounds.height) * GRID_INVERSE_EPSILON_RATIO
  let estimate = {...target}

  for (let iteration = 0; iteration < GRID_INVERSE_ITERATIONS; iteration += 1) {
    const mapped = transformDeformerPoint(node, estimate)
    const horizontalSample = transformDeformerPoint(node, {...estimate, x: estimate.x + epsilon})
    const verticalSample = transformDeformerPoint(node, {...estimate, y: estimate.y + epsilon})
    const horizontalX = (horizontalSample.x - mapped.x) / epsilon
    const horizontalY = (horizontalSample.y - mapped.y) / epsilon
    const verticalX = (verticalSample.x - mapped.x) / epsilon
    const verticalY = (verticalSample.y - mapped.y) / epsilon
    const determinant = horizontalX * verticalY - verticalX * horizontalY

    if (Math.abs(determinant) > MINIMUM_DETERMINANT) {
      const errorX = mapped.x - target.x
      const errorY = mapped.y - target.y
      estimate = {
        x: estimate.x - (verticalY * errorX - verticalX * errorY) / determinant,
        y: estimate.y - (-horizontalY * errorX + horizontalX * errorY) / determinant,
      }
    }
  }

  return estimate
}

const createNodeTransform = (node: PuppetSceneContainerNode): PointTransform => {
  switch (node.kind) {
    case 'deformer':
      return (point) => transformDeformerPoint(node, point)
    case 'group':
      return (point) => point
    default: {
      const exhaustiveNode: never = node
      return exhaustiveNode
    }
  }
}

const createInverseNodeTransform = (node: PuppetSceneContainerNode): PointTransform => {
  switch (node.kind) {
    case 'deformer':
      return (point) => untransformGridPoint(node, point)
    case 'group':
      return (point) => point
    default: {
      const exhaustiveNode: never = node
      return exhaustiveNode
    }
  }
}

const composeTransform =
  (parent: PointTransform, child: PointTransform): PointTransform =>
  (point) =>
    parent(child(point))

const applyTransform = (vertices: Float32Array | number[], transform: PointTransform) => {
  for (let index = 0; index < vertices.length; index += COORDINATES_PER_POINT) {
    const point = transform({x: vertices[index] ?? 0, y: vertices[index + 1] ?? 0})
    vertices[index] = point.x
    vertices[index + 1] = point.y
  }
}

const applyNodes = (
  nodes: ReadonlyArray<PuppetSceneNode>,
  parentTransform: PointTransform,
  verticesByPartId: ReadonlyMap<string, Float32Array | number[]>,
) => {
  for (const node of nodes) {
    if (node.kind === 'part') {
      const vertices = verticesByPartId.get(node.id)

      if (vertices !== undefined) {
        applyTransform(vertices, parentTransform)
      }
    } else {
      applyNodes(
        node.children,
        composeTransform(parentTransform, createNodeTransform(node)),
        verticesByPartId,
      )
    }
  }
}

export const applySceneDeformers = (options: ApplySceneDeformersOptions) => {
  applyNodes(getDocumentScene(options.document).roots, (point) => point, options.verticesByPartId)
}

const findNodeAncestorPath = (
  nodes: ReadonlyArray<PuppetSceneNode>,
  nodeId: string,
  path: ReadonlyArray<PuppetSceneContainerNode> = [],
): ReadonlyArray<PuppetSceneContainerNode> | undefined => {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return path
    }

    if (node.kind !== 'part') {
      const result = findNodeAncestorPath(node.children, nodeId, [...path, node])

      if (result !== undefined) {
        return result
      }
    }
  }

  return undefined
}

export const unapplySceneDeformersPoint = (
  options: UnapplySceneDeformersPointOptions,
): PuppetPoint => {
  const path = findNodeAncestorPath(getDocumentScene(options.document).roots, options.partId) ?? []
  return path.reduce((point, node) => createInverseNodeTransform(node)(point), options.point)
}

export const applySceneNodeAncestorsPoint = (
  options: TransformSceneNodePointOptions,
): PuppetPoint => {
  const path = findNodeAncestorPath(getDocumentScene(options.document).roots, options.nodeId) ?? []
  return path.reduceRight((point, node) => createNodeTransform(node)(point), options.point)
}

export const unapplySceneNodeAncestorsPoint = (
  options: TransformSceneNodePointOptions,
): PuppetPoint => {
  const path = findNodeAncestorPath(getDocumentScene(options.document).roots, options.nodeId) ?? []
  return path.reduce((point, node) => createInverseNodeTransform(node)(point), options.point)
}
