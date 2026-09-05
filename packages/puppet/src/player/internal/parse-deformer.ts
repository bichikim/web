import type {
  PuppetDeformerCurveHandle,
  PuppetParameterDeformerKeyform,
  PuppetSceneNode,
} from '../document'

const CUBIC_DEGREE = 3
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

const hasValidCurveBreaks = (value: Record<string, unknown>) => {
  if (value.curveAxis === undefined) {
    return value.curveBreaks === undefined
  }
  if (!isFiniteNumberArray(value.controlPoints)) {
    return false
  }
  const segmentCount = (value.controlPoints.length / 2 - 1) / CUBIC_DEGREE
  if (!Number.isInteger(segmentCount) || segmentCount < 1) {
    return false
  }
  if (value.curveBreaks === undefined) {
    return segmentCount === 1
  }
  return (
    isFiniteNumberArray(value.curveBreaks) &&
    value.curveBreaks.length === segmentCount + 1 &&
    value.curveBreaks[0] === 0 &&
    value.curveBreaks.at(-1) === 1 &&
    value.curveBreaks.every(
      (boundary, index, boundaries) => index === 0 || boundary > boundaries[index - 1]!,
    )
  )
}

const hasValidCurveAxis = (value: Record<string, unknown>) =>
  hasValidCurveBreaks(value) &&
  (value.curveAxis === undefined ||
    ((value.curveAxis === 'x' || value.curveAxis === 'y') &&
      value.columns === 1 &&
      value.rows === 1 &&
      value.curveHandles === undefined))

const hasValidBones = (value: Record<string, unknown>) => {
  if (value.boneRestPoints === undefined) {
    return true
  }
  const points = value.boneRestPoints
  const MINIMUM_LENGTH = 0.001
  const MAXIMUM_COORDINATES = 66
  const MINIMUM_COORDINATES = 4
  return (
    isFiniteNumberArray(points) &&
    points.length >= MINIMUM_COORDINATES &&
    points.length <= MAXIMUM_COORDINATES &&
    points.length % 2 === 0 &&
    isFiniteNumberArray(value.controlPoints) &&
    value.controlPoints.length === points.length &&
    value.curveAxis === undefined &&
    value.curveHandles === undefined &&
    value.columns === 1 &&
    value.rows === 1 &&
    points.every(
      (coordinate, index) =>
        index < 2 ||
        index % 2 !== 0 ||
        Math.hypot(coordinate - points[index - 2]!, points[index + 1]! - points[index - 1]!) >=
          MINIMUM_LENGTH,
    )
  )
}

const isPin = (pin: unknown): boolean =>
  isRecord(pin) &&
  isPoint(pin) &&
  isFiniteNumber(pin.radius) &&
  pin.radius > 0 &&
  isFiniteNumber(pin.strength) &&
  pin.strength >= 0 &&
  pin.strength <= 1

const hasValidPins = (value: Record<string, unknown>): boolean => {
  if (value.pins === undefined) {
    return true
  }
  return (
    Array.isArray(value.pins) &&
    value.pins.length > 0 &&
    value.boneRestPoints === undefined &&
    value.curveAxis === undefined &&
    value.curveHandles === undefined &&
    value.columns === 1 &&
    value.rows === 1 &&
    isFiniteNumberArray(value.controlPoints) &&
    value.controlPoints.length === value.pins.length * 2 &&
    value.pins.every(isPin)
  )
}

const isBounds = (value: unknown): boolean =>
  isRecord(value) &&
  isFiniteNumber(value.x) &&
  isFiniteNumber(value.y) &&
  isFiniteNumber(value.width) &&
  value.width > 0 &&
  isFiniteNumber(value.height) &&
  value.height > 0

const isDeformerShape = (value: Record<string, unknown>): boolean => {
  if (
    !isBounds(value.bounds) ||
    !Number.isInteger(value.columns) ||
    (value.columns as number) <= 0 ||
    !Number.isInteger(value.rows) ||
    (value.rows as number) <= 0
  ) {
    return false
  }

  if (!hasValidCurveAxis(value) || !hasValidBones(value) || !hasValidPins(value)) {
    return false
  }
  const pointCount = ((value.columns as number) + 1) * ((value.rows as number) + 1)
  return (
    isFiniteNumberArray(value.controlPoints) &&
    (value.pins !== undefined ||
      value.boneRestPoints !== undefined ||
      value.curveAxis !== undefined ||
      value.controlPoints.length === pointCount * COORDINATES_PER_POINT) &&
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

export const isDeformer = (value: Record<string, unknown>): boolean => {
  if (!isDeformerShape(value)) {
    return false
  }
  const {binding} = value
  return (
    binding === undefined ||
    (isRecord(binding) &&
      isRecord(binding.rest) &&
      isDeformerShape(binding.rest) &&
      Array.isArray(binding.steps) &&
      binding.steps.length > 0 &&
      binding.steps.every(
        (step: unknown) =>
          isRecord(step) &&
          isRecord(step.shape) &&
          isDeformerShape(step.shape) &&
          (step.rest === undefined || (isRecord(step.rest) && isDeformerShape(step.rest))),
      ))
  )
}
