import {getBindingInfluence} from './influence'
import {getBoneChannels, poseBoneChannels} from './bone'
import type {
  PuppetDocument,
  PuppetParameterBinding,
  PuppetParameterDeformerKeyform,
  PuppetParameterKeyform,
  PuppetScene,
  PuppetSceneDeformerNode,
  PuppetSceneNode,
} from '../player/document'
import {getDocumentScene} from '../player/scene'
import {type PuppetParameterValues, sampleParameterCoordinates} from './parameter'
import {getParameterBindingValues, type PuppetParameterValueMap} from './composition'

const CURVE_HANDLE_COORDINATE_COUNT = 4
const HORIZONTAL_Y_OFFSET = 1
const VERTICAL_X_OFFSET = 2
const VERTICAL_Y_OFFSET = 3

export const createDeformerKeyform = (
  node: PuppetSceneDeformerNode,
): PuppetParameterDeformerKeyform => ({
  controlPoints: node.controlPoints,
  ...(node.curveHandles === undefined ? {} : {curveHandles: node.curveHandles}),
  kind: node.kind,
  nodeId: node.id,
  ...(node.rotationOrigin === undefined ? {} : {rotationOrigin: node.rotationOrigin}),
  ...(node.spatialOrigin === undefined ? {} : {spatialOrigin: node.spatialOrigin}),
  ...(node.spatialMeshPosition === undefined
    ? {}
    : {spatialMeshPosition: node.spatialMeshPosition}),
  ...(node.spatialRotation === undefined ? {} : {spatialRotation: node.spatialRotation}),
  ...(node.spatialScale === undefined ? {} : {spatialScale: node.spatialScale}),
  ...(node.spatialTranslation === undefined ? {} : {spatialTranslation: node.spatialTranslation}),
})

const getDeformerCoordinates = (
  deformer: PuppetSceneDeformerNode,
  coordinates: ReadonlyArray<number>,
) =>
  deformer.boneRestPoints === undefined
    ? coordinates
    : getBoneChannels(deformer.boneRestPoints, coordinates)

const getKeyformCoordinates = (
  keyform: PuppetParameterKeyform,
  deformer: PuppetSceneDeformerNode,
) => {
  const coordinates = keyform.deformers?.find(
    (candidate) => candidate.nodeId === deformer.id,
  )?.controlPoints
  return coordinates === undefined ? undefined : getDeformerCoordinates(deformer, coordinates)
}

const getRestCoordinates = (deformer: PuppetSceneDeformerNode) =>
  getDeformerCoordinates(deformer, deformer.controlPoints)

const getControlPointCenter = (controlPoints: ReadonlyArray<number>) => {
  const pointCount = controlPoints.length / 2
  let x = 0
  let y = 0

  for (let index = 0; index < controlPoints.length; index += 2) {
    x += controlPoints[index] ?? 0
    y += controlPoints[index + 1] ?? 0
  }

  return {x: x / pointCount, y: y / pointCount}
}

const getRestRotationOrigin = (deformer: PuppetSceneDeformerNode) =>
  deformer.rotationOrigin ?? getControlPointCenter(deformer.controlPoints)

type SpatialProperty =
  | 'spatialMeshPosition'
  | 'spatialOrigin'
  | 'spatialRotation'
  | 'spatialScale'
  | 'spatialTranslation'

const getRestSpatialCoordinates = (deformer: PuppetSceneDeformerNode, key: SpatialProperty) =>
  deformer[key] ?? (key === 'spatialScale' ? ([1, 1, 1] as const) : ([0, 0, 0] as const))

const toSpatialCoordinates = (
  values: ReadonlyArray<number>,
  fallback = 0,
): readonly [number, number, number] => [
  values[0] ?? fallback,
  values[1] ?? fallback,
  values[2] ?? fallback,
]

const sampleSpatialCoordinates = (
  options: SampleParameterDeformerOptions,
  key: SpatialProperty,
) => {
  const rest = getRestSpatialCoordinates(options.deformer, key)
  return toSpatialCoordinates(
    sampleParameterCoordinates({
      binding: options.binding,
      keyformCoordinates: options.binding.keyforms.map(
        (keyform) =>
          keyform.deformers?.find((candidate) => candidate.nodeId === options.deformer.id)?.[key] ??
          rest,
      ),
      restCoordinates: rest,
      values: options.values,
    }),
    key === 'spatialScale' ? 1 : 0,
  )
}

const getKeyformRotationOrigin = (
  keyform: PuppetParameterKeyform,
  deformer: PuppetSceneDeformerNode,
) => {
  const origin =
    keyform.deformers?.find((candidate) => candidate.nodeId === deformer.id)?.rotationOrigin ??
    getRestRotationOrigin(deformer)
  return [origin.x, origin.y]
}

const getCurveHandleCoordinates = (
  handles: PuppetParameterDeformerKeyform['curveHandles'],
  deformer: PuppetSceneDeformerNode,
) =>
  (deformer.curveHandles ?? []).flatMap((restHandle) => {
    const handle =
      handles?.find((candidate) => candidate.pointIndex === restHandle.pointIndex) ?? restHandle
    return [handle.horizontal.x, handle.horizontal.y, handle.vertical.x, handle.vertical.y]
  })

const createCurveHandles = (
  deformer: PuppetSceneDeformerNode,
  coordinates: ReadonlyArray<number>,
) =>
  deformer.curveHandles?.map((handle, index) => ({
    horizontal: {
      x: coordinates[index * CURVE_HANDLE_COORDINATE_COUNT] ?? handle.horizontal.x,
      y:
        coordinates[index * CURVE_HANDLE_COORDINATE_COUNT + HORIZONTAL_Y_OFFSET] ??
        handle.horizontal.y,
    },
    pointIndex: handle.pointIndex,
    vertical: {
      x:
        coordinates[index * CURVE_HANDLE_COORDINATE_COUNT + VERTICAL_X_OFFSET] ?? handle.vertical.x,
      y:
        coordinates[index * CURVE_HANDLE_COORDINATE_COUNT + VERTICAL_Y_OFFSET] ?? handle.vertical.y,
    },
  }))

const createSampledDeformer = (
  deformer: PuppetSceneDeformerNode,
  coordinates: ReadonlyArray<number>,
  curveHandleCoordinates: ReadonlyArray<number> = getCurveHandleCoordinates(
    deformer.curveHandles,
    deformer,
  ),
  rotationOriginCoordinates: ReadonlyArray<number> = Object.values(getRestRotationOrigin(deformer)),
): PuppetParameterDeformerKeyform => ({
  controlPoints:
    deformer.boneRestPoints === undefined
      ? coordinates
      : poseBoneChannels(deformer.boneRestPoints, coordinates),
  ...(deformer.curveHandles === undefined
    ? {}
    : {curveHandles: createCurveHandles(deformer, curveHandleCoordinates)}),
  kind: deformer.kind,
  nodeId: deformer.id,
  rotationOrigin: {
    x: rotationOriginCoordinates[0] ?? getRestRotationOrigin(deformer).x,
    y: rotationOriginCoordinates[1] ?? getRestRotationOrigin(deformer).y,
  },
})

const addDeformerDelta = (
  current: ReadonlyArray<number>,
  sampled: ReadonlyArray<number>,
  rest: ReadonlyArray<number>,
  weight: number,
) =>
  rest.map(
    (coordinate, index) =>
      (current[index] ?? coordinate) + ((sampled[index] ?? coordinate) - coordinate) * weight,
  )

export interface SampleParameterDeformerOptions {
  readonly binding: PuppetParameterBinding
  readonly deformer: PuppetSceneDeformerNode
  readonly values: PuppetParameterValues
}

export const sampleParameterDeformer = (
  options: SampleParameterDeformerOptions,
): PuppetParameterDeformerKeyform => {
  const sampled = createSampledDeformer(
    options.deformer,
    sampleParameterCoordinates({
      binding: options.binding,
      keyformCoordinates: options.binding.keyforms.map((keyform) =>
        getKeyformCoordinates(keyform, options.deformer),
      ),
      restCoordinates: getRestCoordinates(options.deformer),
      values: options.values,
    }),
    sampleParameterCoordinates({
      binding: options.binding,
      keyformCoordinates: options.binding.keyforms.map((keyform) =>
        getCurveHandleCoordinates(
          keyform.deformers?.find((candidate) => candidate.nodeId === options.deformer.id)
            ?.curveHandles,
          options.deformer,
        ),
      ),
      restCoordinates: getCurveHandleCoordinates(options.deformer.curveHandles, options.deformer),
      values: options.values,
    }),
    sampleParameterCoordinates({
      binding: options.binding,
      keyformCoordinates: options.binding.keyforms.map((keyform) =>
        getKeyformRotationOrigin(keyform, options.deformer),
      ),
      restCoordinates: Object.values(getRestRotationOrigin(options.deformer)),
      values: options.values,
    }),
  )
  return options.deformer.deformerType === 'spatial'
    ? {
        ...sampled,
        spatialMeshPosition: sampleSpatialCoordinates(options, 'spatialMeshPosition'),
        spatialOrigin: sampleSpatialCoordinates(options, 'spatialOrigin'),
        spatialRotation: sampleSpatialCoordinates(options, 'spatialRotation'),
        spatialScale: sampleSpatialCoordinates(options, 'spatialScale'),
        spatialTranslation: sampleSpatialCoordinates(options, 'spatialTranslation'),
      }
    : sampled
}

export const composeParameterDeformer = (
  document: PuppetDocument,
  deformer: PuppetSceneDeformerNode,
  parameterValues: PuppetParameterValueMap | undefined,
) => {
  const restCoordinates = getRestCoordinates(deformer)
  const restCurveHandleCoordinates = getCurveHandleCoordinates(deformer.curveHandles, deformer)
  const restRotationOrigin = Object.values(getRestRotationOrigin(deformer))
  const restSpatialOrigin = getRestSpatialCoordinates(deformer, 'spatialOrigin')
  const restSpatialMeshPosition = getRestSpatialCoordinates(deformer, 'spatialMeshPosition')
  const restSpatialRotation = getRestSpatialCoordinates(deformer, 'spatialRotation')
  const restSpatialScale = getRestSpatialCoordinates(deformer, 'spatialScale')
  const restSpatialTranslation = getRestSpatialCoordinates(deformer, 'spatialTranslation')
  let coordinates = restCoordinates
  let curveHandleCoordinates = restCurveHandleCoordinates
  let rotationOriginCoordinates = restRotationOrigin
  let spatialOriginCoordinates: ReadonlyArray<number> = restSpatialOrigin
  let spatialMeshPositionCoordinates: ReadonlyArray<number> = restSpatialMeshPosition
  let spatialRotationCoordinates: ReadonlyArray<number> = restSpatialRotation
  let spatialScaleCoordinates: ReadonlyArray<number> = restSpatialScale
  let spatialTranslationCoordinates: ReadonlyArray<number> = restSpatialTranslation

  for (const binding of document.parameterBindings ?? []) {
    if (binding.targetDeformerIds?.includes(deformer.id) === true) {
      const sampled = sampleParameterDeformer({
        binding,
        deformer,
        values: getParameterBindingValues({binding, document, parameterValues}),
      })
      const weight = getBindingInfluence({binding, document, parameterValues})
      coordinates = addDeformerDelta(
        coordinates,
        getDeformerCoordinates(deformer, sampled.controlPoints),
        restCoordinates,
        weight,
      )
      curveHandleCoordinates = addDeformerDelta(
        curveHandleCoordinates,
        getCurveHandleCoordinates(sampled.curveHandles, deformer),
        restCurveHandleCoordinates,
        weight,
      )
      rotationOriginCoordinates = addDeformerDelta(
        rotationOriginCoordinates,
        Object.values(sampled.rotationOrigin ?? getRestRotationOrigin(deformer)),
        restRotationOrigin,
        weight,
      )
      if (deformer.deformerType === 'spatial') {
        spatialMeshPositionCoordinates = addDeformerDelta(
          spatialMeshPositionCoordinates,
          sampled.spatialMeshPosition ?? restSpatialMeshPosition,
          restSpatialMeshPosition,
          weight,
        )
        spatialOriginCoordinates = addDeformerDelta(
          spatialOriginCoordinates,
          sampled.spatialOrigin ?? restSpatialOrigin,
          restSpatialOrigin,
          weight,
        )
        spatialRotationCoordinates = addDeformerDelta(
          spatialRotationCoordinates,
          sampled.spatialRotation ?? restSpatialRotation,
          restSpatialRotation,
          weight,
        )
        spatialScaleCoordinates = addDeformerDelta(
          spatialScaleCoordinates,
          sampled.spatialScale ?? restSpatialScale,
          restSpatialScale,
          weight,
        )
        spatialTranslationCoordinates = addDeformerDelta(
          spatialTranslationCoordinates,
          sampled.spatialTranslation ?? restSpatialTranslation,
          restSpatialTranslation,
          weight,
        )
      }
    }
  }

  const sampled = createSampledDeformer(
    deformer,
    coordinates,
    curveHandleCoordinates,
    rotationOriginCoordinates,
  )
  return {
    ...deformer,
    controlPoints: sampled.controlPoints,
    curveHandles: sampled.curveHandles,
    rotationOrigin: sampled.rotationOrigin,
    ...(deformer.deformerType === 'spatial'
      ? {
          spatialMeshPosition: toSpatialCoordinates(spatialMeshPositionCoordinates),
          spatialOrigin: toSpatialCoordinates(spatialOriginCoordinates),
          spatialRotation: toSpatialCoordinates(spatialRotationCoordinates),
          spatialScale: toSpatialCoordinates(spatialScaleCoordinates, 1),
          spatialTranslation: toSpatialCoordinates(spatialTranslationCoordinates),
        }
      : {}),
  }
}

const composeSceneNodes = (
  document: PuppetDocument,
  nodes: ReadonlyArray<PuppetSceneNode>,
  parameterValues: PuppetParameterValueMap | undefined,
): ReadonlyArray<PuppetSceneNode> =>
  nodes.map((node) => {
    if (node.kind === 'part') {
      return node
    }
    const children = composeSceneNodes(document, node.children, parameterValues)
    return node.kind === 'group'
      ? {...node, children}
      : {...composeParameterDeformer(document, node, parameterValues), children}
  })

export const composeParameterScene = (
  document: PuppetDocument,
  parameterValues?: PuppetParameterValueMap,
): PuppetScene => ({
  roots: composeSceneNodes(document, getDocumentScene(document).roots, parameterValues),
})
