import type {
  PuppetDeformerCurveHandle,
  PuppetParameterDeformerKeyform,
  PuppetSceneNode,
} from '../document'

const COORDINATES_PER_POINT = 2

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const isFiniteNumberArray = (value: unknown): value is ReadonlyArray<number> =>
  Array.isArray(value) && value.every(isFiniteNumber)

const isPoint = (value: unknown) =>
  isRecord(value) && isFiniteNumber(value.x) && isFiniteNumber(value.y)

const isCurveHandle = (value: unknown): value is PuppetDeformerCurveHandle =>
  isRecord(value) &&
  Number.isInteger(value.pointIndex) &&
  (value.pointIndex as number) >= 0 &&
  isPoint(value.horizontal) &&
  isPoint(value.vertical)

const isCurveHandles = (value: unknown, pointCount?: number) =>
  value === undefined ||
  (Array.isArray(value) &&
    value.every(isCurveHandle) &&
    new Set(value.map((handle) => handle.pointIndex)).size === value.length &&
    (pointCount === undefined || value.every((handle) => handle.pointIndex < pointCount)))

export const isDeformer = (value: Record<string, unknown>) => {
  if (
    !isRecord(value.bounds) ||
    !isFiniteNumber(value.bounds.x) ||
    !isFiniteNumber(value.bounds.y) ||
    !isFiniteNumber(value.bounds.width) ||
    value.bounds.width <= 0 ||
    !isFiniteNumber(value.bounds.height) ||
    value.bounds.height <= 0 ||
    !Number.isInteger(value.columns) ||
    (value.columns as number) <= 0 ||
    !Number.isInteger(value.rows) ||
    (value.rows as number) <= 0
  ) {
    return false
  }

  const pointCount = ((value.columns as number) + 1) * ((value.rows as number) + 1)
  return (
    isFiniteNumberArray(value.controlPoints) &&
    value.controlPoints.length === pointCount * COORDINATES_PER_POINT &&
    isCurveHandles(value.curveHandles, pointCount) &&
    (value.rotationOrigin === undefined || isPoint(value.rotationOrigin))
  )
}

export const isParameterDeformerKeyform = (
  value: unknown,
): value is PuppetParameterDeformerKeyform =>
  isRecord(value) &&
  typeof value.nodeId === 'string' &&
  value.nodeId.length > 0 &&
  value.kind === 'deformer' &&
  isFiniteNumberArray(value.controlPoints) &&
  isCurveHandles(value.curveHandles) &&
  (value.rotationOrigin === undefined || isPoint(value.rotationOrigin))

export const hasValidDeformerKeyform = (
  deformer: PuppetParameterDeformerKeyform,
  node: PuppetSceneNode | undefined,
) => {
  if (node?.kind !== 'deformer') {
    return false
  }

  const pointIndices = new Set(node.curveHandles?.map((handle) => handle.pointIndex) ?? [])
  return (
    node.controlPoints.length === deformer.controlPoints.length &&
    (deformer.curveHandles?.length ?? 0) === pointIndices.size &&
    deformer.curveHandles?.every((handle) => pointIndices.has(handle.pointIndex)) !== false
  )
}
