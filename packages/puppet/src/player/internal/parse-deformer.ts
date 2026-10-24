import type {
  PuppetDeformerCurveHandle,
  PuppetParameterDeformerKeyform,
  PuppetSceneNode,
} from '../document'
import {isPartRenderProperties} from './parse-part-properties'
import {isSpatialMesh} from './parse-spatial-mesh'
import {isFiniteNumber, isFiniteNumberArray, isRecord} from './parse-primitives'

const CUBIC_DEGREE = 3
const COORDINATES_PER_POINT = 2
const SPATIAL_COORDINATES = 3

const isSpatialCoordinates = (value: unknown): value is ReadonlyArray<number> =>
  isFiniteNumberArray(value) && value.length === SPATIAL_COORDINATES

const isPositiveSpatialScale = (value: unknown) =>
  isSpatialCoordinates(value) && value.every((coordinate) => coordinate > 0)

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

const hasValidWeights = (value: Record<string, unknown>): boolean => {
  if (value.boneWeights === undefined) {
    return true
  }
  const points = value.boneRestPoints
  if (!isFiniteNumberArray(points) || !Array.isArray(value.boneWeights)) {
    return false
  }
  const TOLERANCE = 0.000001
  const keys = new Set<string>()
  return value.boneWeights.every((entry: unknown) => {
    if (
      !isRecord(entry) ||
      typeof entry.partId !== 'string' ||
      entry.partId.length === 0 ||
      !isFiniteNumber(entry.vertexIndex) ||
      !Number.isInteger(entry.vertexIndex) ||
      entry.vertexIndex < 0 ||
      !isFiniteNumberArray(entry.weights) ||
      entry.weights.length !== points.length / 2 - 1 ||
      entry.weights.some((weight) => weight < 0 || weight > 1) ||
      (entry.weights.length > 1 &&
        Math.abs(entry.weights.reduce((sum, weight) => sum + weight, 0) - 1) > TOLERANCE)
    ) {
      return false
    }
    const key = JSON.stringify([entry.partId, entry.vertexIndex])
    if (keys.has(key)) {
      return false
    }
    keys.add(key)
    return true
  })
}

const hasValidInfluences = (value: Record<string, unknown>): boolean => {
  if (value.vertexInfluences === undefined) {
    return true
  }
  if (!Array.isArray(value.vertexInfluences)) {
    return false
  }
  const keys = new Set<string>()
  return value.vertexInfluences.every((entry: unknown) => {
    if (
      !isRecord(entry) ||
      typeof entry.partId !== 'string' ||
      entry.partId.length === 0 ||
      !isFiniteNumber(entry.vertexIndex) ||
      !Number.isInteger(entry.vertexIndex) ||
      entry.vertexIndex < 0 ||
      !isFiniteNumber(entry.weight) ||
      entry.weight < 0 ||
      entry.weight > 1
    ) {
      return false
    }
    const key = JSON.stringify([entry.partId, entry.vertexIndex])
    if (keys.has(key)) {
      return false
    }
    keys.add(key)
    return true
  })
}

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

const hasValidSpatialMeshPosition = (value: Record<string, unknown>): boolean =>
  value.spatialMeshPosition === undefined || isSpatialCoordinates(value.spatialMeshPosition)

const hasValidSpatial = (value: Record<string, unknown>): boolean => {
  return (
    value.deformerType === 'spatial' &&
    Array.isArray(value.spatialOrigin) &&
    value.spatialOrigin.length === SPATIAL_COORDINATES &&
    value.spatialOrigin.every(isFiniteNumber) &&
    (value.spatialRotation === undefined ||
      (Array.isArray(value.spatialRotation) &&
        value.spatialRotation.length === SPATIAL_COORDINATES &&
        value.spatialRotation.every(isFiniteNumber))) &&
    (value.spatialScale === undefined || isPositiveSpatialScale(value.spatialScale)) &&
    (value.spatialTranslation === undefined || isSpatialCoordinates(value.spatialTranslation)) &&
    hasValidSpatialMeshPosition(value) &&
    (value.spatialMesh === undefined || isSpatialMesh(value.spatialMesh)) &&
    value.boneRestPoints === undefined &&
    value.pins === undefined
  )
}

const hasValidRotation = (value: Record<string, unknown>): boolean => {
  const ROTATION_COORDINATES = 4
  return (
    value.deformerType === undefined ||
    hasValidSpatial(value) ||
    (value.deformerType === 'rotation' &&
      isFiniteNumberArray(value.boneRestPoints) &&
      value.boneRestPoints.length === ROTATION_COORDINATES &&
      value.boneWeights === undefined &&
      value.vertexInfluences === undefined &&
      value.pins === undefined)
  )
}

const hasRotationReference = (value: Record<string, unknown>) =>
  value.rotationReferenceDistance === undefined ||
  (value.deformerType === 'rotation' &&
    isFiniteNumber(value.rotationReferenceDistance) &&
    value.rotationReferenceDistance !== 0)

const hasCoordinateOptions = (value: Record<string, unknown>) =>
  (value.rotationAngle === undefined ||
    (value.deformerType === 'rotation' && isFiniteNumber(value.rotationAngle))) &&
  hasRotationReference(value) &&
  (value.rotationScale === undefined ||
    (value.deformerType === 'rotation' &&
      typeof value.rotationScale === 'number' &&
      Number.isFinite(value.rotationScale) &&
      value.rotationScale >= 0)) &&
  isRotationReflection(value.rotationReflection) &&
  (value.rotationReflection === undefined || value.deformerType === 'rotation') &&
  (value.coordinateSpace === undefined || value.coordinateSpace === 'parent') &&
  (value.interpolation === undefined ||
    value.interpolation === 'triangles' ||
    value.interpolation === 'bilinear' ||
    value.interpolation === 'triangles-mirrored')

const isRotationReflection = (value: unknown) =>
  value === undefined ||
  (Array.isArray(value) && value.length === 2 && value.every((flag) => typeof flag === 'boolean'))

const isDeformerShape = (value: Record<string, unknown>): boolean => {
  if (!hasValidRotation(value) || !hasCoordinateOptions(value)) {
    return false
  }
  if (
    !isBounds(value.bounds) ||
    !Number.isInteger(value.columns) ||
    (value.columns as number) <= 0 ||
    !Number.isInteger(value.rows) ||
    (value.rows as number) <= 0
  ) {
    return false
  }

  if (
    !hasValidCurveAxis(value) ||
    !hasValidBones(value) ||
    !hasValidPins(value) ||
    !hasValidWeights(value) ||
    !hasValidInfluences(value)
  ) {
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
  unbounded = false,
): value is PuppetParameterDeformerKeyform =>
  isRecord(value) &&
  typeof value.nodeId === 'string' &&
  value.nodeId.length > 0 &&
  value.kind === 'deformer' &&
  isFiniteNumberArray(value.controlPoints) &&
  (value.rotationAngle === undefined || isFiniteNumber(value.rotationAngle)) &&
  isRotationReflection(value.rotationReflection) &&
  isCurveHandles(value.curveHandles) &&
  (value.rotationOrigin === undefined || isPoint(value.rotationOrigin)) &&
  hasValidSpatialKeys(value) &&
  (value.properties === undefined || isDeformerRenderProperties(value.properties, unbounded)) &&
  (value.rotationScale === undefined ||
    (typeof value.rotationScale === 'number' &&
      Number.isFinite(value.rotationScale) &&
      (unbounded || value.rotationScale >= 0)))

const SPATIAL_KEYS = [
  'spatialMeshPosition',
  'spatialOrigin',
  'spatialRotation',
  'spatialScale',
  'spatialTranslation',
] as const

const hasValidSpatialKeys = (value: Record<string, unknown>) =>
  SPATIAL_KEYS.every((key) =>
    key === 'spatialScale'
      ? value[key] === undefined || isPositiveSpatialScale(value[key])
      : value[key] === undefined || isSpatialCoordinates(value[key]),
  )

/** Opacity and colors only, within 0..1. */
const isDeformerRenderProperties = (value: unknown, unbounded = false) =>
  isPartRenderProperties(value, unbounded) &&
  Object.keys(value).every((key) => DEFORMER_RENDER_PROPERTIES.has(key))

const DEFORMER_RENDER_PROPERTIES: ReadonlySet<string> = new Set([
  'multiplyColor',
  'opacity',
  'screenColor',
])

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
    (node.deformerType === 'spatial' || SPATIAL_KEYS.every((key) => deformer[key] === undefined)) &&
    (deformer.rotationScale === undefined || node.deformerType === 'rotation') &&
    (deformer.rotationAngle === undefined || node.deformerType === 'rotation') &&
    (deformer.rotationReflection === undefined || node.deformerType === 'rotation') &&
    (deformer.curveHandles?.length ?? 0) === pointIndices.size &&
    deformer.curveHandles?.every((handle) => pointIndices.has(handle.pointIndex)) !== false
  )
}

export const isDeformer = (value: Record<string, unknown>): boolean => {
  if (
    !isDeformerShape(value) ||
    (value.properties !== undefined && !isDeformerRenderProperties(value.properties))
  ) {
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
