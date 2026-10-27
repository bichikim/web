import {getTargetBindings} from './target-bindings'
import {getBindingInfluence} from './influence'
import {getBoneChannels, poseBoneChannels} from './bone'
import {sampleDeformerProperties} from './deformer-properties'
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
import {getRepeatRanges} from '../player/parameter-value'
import {
  type PuppetParameterValues,
  type PuppetRepeatRanges,
  sampleParameterCoordinates,
} from './parameter'
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
  ...(node.rotationAngle === undefined ? {} : {rotationAngle: node.rotationAngle}),
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
  rotationAngle?: number,
) => {
  if (deformer.deformerType === 'rotation' && rotationAngle !== undefined) {
    const rest = deformer.boneRestPoints ?? [0, 0, 1, 0]
    const angle = Math.atan2(rest[3]! - rest[1]!, rest[2]! - rest[0]!)
    const direction = Math.atan2(
      coordinates[3]! - coordinates[1]!,
      coordinates[2]! - coordinates[0]!,
    )
    const offset = direction - rotationAngle
    const unwrapped = rotationAngle + Math.atan2(Math.sin(offset), Math.cos(offset))
    return [coordinates[0]!, coordinates[1]!, unwrapped - angle]
  }
  return deformer.boneRestPoints === undefined
    ? coordinates
    : getBoneChannels(deformer.boneRestPoints, coordinates)
}

const getKeyformCoordinates = (
  keyform: PuppetParameterKeyform,
  deformer: PuppetSceneDeformerNode,
) => {
  const keyed = keyform.deformers?.find((candidate) => candidate.nodeId === deformer.id)
  const coordinates = keyed?.controlPoints
  if (coordinates === undefined) {
    return undefined
  }
  const sampled = getDeformerCoordinates(deformer, coordinates, keyed?.rotationAngle)
  if (deformer.boneRestPoints === undefined || keyed?.rotationAngle !== undefined) {
    return sampled
  }
  const reference = getRestCoordinates(deformer)
  return sampled.map((value, index) => {
    if (index < 2) {
      return value
    }
    const center = reference[index] ?? 0
    const offset = value - center
    return center + Math.atan2(Math.sin(offset), Math.cos(offset))
  })
}

const getRestCoordinates = (deformer: PuppetSceneDeformerNode) =>
  getDeformerCoordinates(deformer, deformer.controlPoints, deformer.rotationAngle)

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
      repeatRanges: options.repeatRanges,
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

const getRotationAngle = (
  deformer: PuppetSceneDeformerNode,
  coordinates: ReadonlyArray<number>,
) => {
  if (deformer.rotationAngle === undefined) {
    return {}
  }
  const rest = deformer.boneRestPoints ?? [0, 0, 1, 0]
  return {rotationAngle: coordinates[2]! + Math.atan2(rest[3]! - rest[1]!, rest[2]! - rest[0]!)}
}

const createSampledDeformer = (
  deformer: PuppetSceneDeformerNode,
  coordinates: ReadonlyArray<number>,
  curveHandleCoordinates: ReadonlyArray<number> = getCurveHandleCoordinates(
    deformer.curveHandles,
    deformer,
  ),
  rotationOriginCoordinates: ReadonlyArray<number> = Object.values(getRestRotationOrigin(deformer)),
): PuppetParameterDeformerKeyform => ({
  ...getRotationAngle(deformer, coordinates),
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

/** 기본 배율을 기준으로 회전 디포머의 키폼 배율을 계산한다. */
const sampleRotationScale = (options: SampleParameterDeformerOptions) =>
  sampleParameterCoordinates({
    binding: options.binding,
    keyformCoordinates: options.binding.keyforms.map((keyform) => [
      keyform.deformers?.find((candidate) => candidate.nodeId === options.deformer.id)
        ?.rotationScale ??
        options.deformer.rotationScale ??
        1,
    ]),
    repeatRanges: options.repeatRanges,
    restCoordinates: [options.deformer.rotationScale ?? 1],
    values: options.values,
  })[0] ?? 1

const sampleRotationReflection = (
  options: SampleParameterDeformerOptions,
): readonly [boolean, boolean] => {
  const values = sampleParameterCoordinates({
    binding: options.binding,
    keyformCoordinates: options.binding.keyforms.map((keyform) =>
      (
        keyform.deformers?.find((candidate) => candidate.nodeId === options.deformer.id)
          ?.rotationReflection ??
        options.deformer.rotationReflection ?? [false, false]
      ).map(Number),
    ),
    repeatRanges: options.repeatRanges,
    restCoordinates: (options.deformer.rotationReflection ?? [false, false]).map(Number),
    sampling: 'step',
    values: options.values,
  })
  return [values[0]! > 0, values[1]! > 0]
}

export interface SampleParameterDeformerOptions {
  readonly binding: PuppetParameterBinding
  readonly deformer: PuppetSceneDeformerNode
  readonly repeatRanges?: PuppetRepeatRanges
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
      repeatRanges: options.repeatRanges,
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
      repeatRanges: options.repeatRanges,
      restCoordinates: getCurveHandleCoordinates(options.deformer.curveHandles, options.deformer),
      values: options.values,
    }),
    sampleParameterCoordinates({
      binding: options.binding,
      keyformCoordinates: options.binding.keyforms.map((keyform) =>
        getKeyformRotationOrigin(keyform, options.deformer),
      ),
      repeatRanges: options.repeatRanges,
      restCoordinates: Object.values(getRestRotationOrigin(options.deformer)),
      values: options.values,
    }),
  )
  const properties = sampleDeformerProperties(options)
  const keyed = properties === undefined ? sampled : {...sampled, properties}
  if (options.deformer.deformerType === 'rotation') {
    return {
      ...keyed,
      rotationReflection: sampleRotationReflection(options),
      rotationScale: sampleRotationScale(options),
    }
  }
  return options.deformer.deformerType === 'spatial'
    ? {
        ...keyed,
        spatialMeshPosition: sampleSpatialCoordinates(options, 'spatialMeshPosition'),
        spatialOrigin: sampleSpatialCoordinates(options, 'spatialOrigin'),
        spatialRotation: sampleSpatialCoordinates(options, 'spatialRotation'),
        spatialScale: sampleSpatialCoordinates(options, 'spatialScale'),
        spatialTranslation: sampleSpatialCoordinates(options, 'spatialTranslation'),
      }
    : keyed
}

const getExplicitAngle = (
  deformer: PuppetSceneDeformerNode,
  sampled: {readonly rotationAngle?: number},
) => (deformer.rotationAngle === undefined ? {} : {rotationAngle: sampled.rotationAngle})

const composeDeformer = (
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
  const restRotationScale = [deformer.rotationScale ?? 1]
  let rotationScale: ReadonlyArray<number> = restRotationScale
  const restReflection = (deformer.rotationReflection ?? [false, false]).map(Number)
  let rotationReflection: ReadonlyArray<number> = restReflection

  for (const binding of getTargetBindings(
    document.parameterBindings ?? [],
    'targetDeformerIds',
    deformer.id,
  )) {
    if (binding.targetDeformerIds?.includes(deformer.id) === true) {
      const sampled = sampleParameterDeformer({
        binding,
        deformer,
        repeatRanges: getRepeatRanges(binding.parameterIds, document.parameters),
        values: getParameterBindingValues({binding, document, parameterValues}),
      })
      const weight = getBindingInfluence({binding, document, parameterValues})
      coordinates = addDeformerDelta(
        coordinates,
        getDeformerCoordinates(deformer, sampled.controlPoints, sampled.rotationAngle),
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
      if (deformer.deformerType === 'rotation') {
        rotationReflection = addDeformerDelta(
          rotationReflection,
          (sampled.rotationReflection ?? [false, false]).map(Number),
          restReflection,
          getBindingInfluence({binding, document, parameterValues, sampling: 'step'}),
        )
        rotationScale = addDeformerDelta(
          rotationScale,
          [sampled.rotationScale ?? 1],
          restRotationScale,
          weight,
        )
      }
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
    ...getExplicitAngle(deformer, sampled),
    curveHandles: sampled.curveHandles,
    rotationOrigin: sampled.rotationOrigin,
    // Bindings add their scale offsets; the sum stops at zero rather than mirroring the deformer.
    ...(deformer.deformerType === 'rotation'
      ? {
          rotationReflection: [rotationReflection[0]! > 0, rotationReflection[1]! > 0] as const,
          rotationScale: Math.max(0, rotationScale[0] ?? 1),
        }
      : {}),
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

interface DeformerSample {
  readonly parameterIds: ReadonlyArray<string>
  readonly values: ReadonlyArray<number | undefined>
  readonly posed: ReturnType<typeof composeDeformer>
}

// Keep only the latest input/pose for each rest node; released documents release their samples.
const deformerSamples = new WeakMap<
  PuppetDocument,
  WeakMap<PuppetSceneDeformerNode, DeformerSample>
>()

export const composeParameterDeformer = (
  document: PuppetDocument,
  deformer: PuppetSceneDeformerNode,
  parameterValues: PuppetParameterValueMap | undefined,
) => {
  let samples = deformerSamples.get(document)
  if (samples === undefined) {
    samples = new WeakMap()
    deformerSamples.set(document, samples)
  }
  const previous = samples.get(deformer)
  if (
    previous !== undefined &&
    previous.parameterIds.every((id, index) =>
      Object.is(parameterValues?.[id], previous.values[index]),
    )
  ) {
    return previous.posed
  }
  const parameterIds = previous?.parameterIds ?? [
    ...new Set(
      getTargetBindings(document.parameterBindings ?? [], 'targetDeformerIds', deformer.id).flatMap(
        (binding) => [
          ...binding.parameterIds,
          ...(binding.influences ?? []).map((influence) => influence.parameterId),
        ],
      ),
    ),
  ]
  const posed = composeDeformer(document, deformer, parameterValues)
  samples.set(deformer, {
    parameterIds,
    posed,
    values: parameterIds.map((id) => parameterValues?.[id]),
  })
  return posed
}

interface SceneSample {
  readonly poses: ReadonlyArray<PuppetSceneNode>
  readonly output: ReadonlyArray<PuppetSceneNode>
}

const sceneSamples = new WeakMap<
  PuppetDocument,
  WeakMap<ReadonlyArray<PuppetSceneNode>, SceneSample>
>()

const composeSceneNodes = (
  document: PuppetDocument,
  nodes: ReadonlyArray<PuppetSceneNode>,
  parameterValues: PuppetParameterValueMap | undefined,
): ReadonlyArray<PuppetSceneNode> => {
  let samples = sceneSamples.get(document)
  if (samples === undefined) {
    samples = new WeakMap()
    sceneSamples.set(document, samples)
  }
  const previous = samples.get(nodes)
  const poses = nodes.map((node) =>
    node.kind === 'deformer' ? composeParameterDeformer(document, node, parameterValues) : node,
  )
  const output = poses.map((pose, index) => {
    if (pose.kind === 'part') {
      return pose
    }
    const children = composeSceneNodes(document, pose.children, parameterValues)
    const prior = previous?.output[index]
    return prior !== undefined &&
      prior.kind !== 'part' &&
      previous?.poses[index] === pose &&
      prior.children === children
      ? prior
      : {...pose, children}
  })
  const stable =
    previous !== undefined && output.every((node, index) => node === previous.output[index])
      ? previous.output
      : output
  samples.set(nodes, {output: stable, poses})
  return stable
}

export const composeParameterScene = (
  document: PuppetDocument,
  parameterValues?: PuppetParameterValueMap,
): PuppetScene => ({
  roots: composeSceneNodes(document, getDocumentScene(document).roots, parameterValues),
})
