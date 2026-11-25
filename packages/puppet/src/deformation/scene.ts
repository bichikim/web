import {getTargetBindings} from './target-bindings'
import {getBindingInfluence} from './influence'
import {poseBoneChannels} from './bone'
import {
  getCurveHandleCoordinates,
  getDeformerCoordinates,
  getDeformerKeyforms,
  getDeformerRest,
} from './deformer-coordinates'
import {sampleDeformerProperties} from './deformer-properties'
import type {
  PuppetDocument,
  PuppetParameterBinding,
  PuppetParameterDeformerKeyform,
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

const getRestCoordinates = (deformer: PuppetSceneDeformerNode) =>
  getDeformerRest(deformer).coordinates

const getRestRotationOrigin = (deformer: PuppetSceneDeformerNode) =>
  getDeformerRest(deformer).rotationOrigin

type SpatialProperty =
  | 'spatialMeshPosition'
  | 'spatialOrigin'
  | 'spatialRotation'
  | 'spatialScale'
  | 'spatialTranslation'

const SPATIAL_ORIGIN = [0, 0, 0] as const
const SPATIAL_SCALE = [1, 1, 1] as const
const getRestSpatialCoordinates = (deformer: PuppetSceneDeformerNode, key: SpatialProperty) =>
  deformer[key] ?? (key === 'spatialScale' ? SPATIAL_SCALE : SPATIAL_ORIGIN)

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
const sampleRotationScale = (options: SampleParameterDeformerOptions) => {
  const channels = getDeformerKeyforms(options.binding, options.deformer)
  return (
    sampleParameterCoordinates({
      binding: options.binding,
      keyformCoordinates: channels.rotationScale,
      repeatRanges: options.repeatRanges,
      restCoordinates: channels.rest.rotationScale,
      values: options.values,
    })[0] ?? 1
  )
}

const sampleRotationReflection = (
  options: SampleParameterDeformerOptions,
): readonly [boolean, boolean] => {
  const channels = getDeformerKeyforms(options.binding, options.deformer)
  const values = sampleParameterCoordinates({
    binding: options.binding,
    keyformCoordinates: channels.rotationReflection,
    repeatRanges: options.repeatRanges,
    restCoordinates: channels.rest.rotationReflection,
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
  const channels = getDeformerKeyforms(options.binding, options.deformer)
  const sampled = createSampledDeformer(
    options.deformer,
    sampleParameterCoordinates({
      binding: options.binding,
      keyformCoordinates: channels.coordinates,
      repeatRanges: options.repeatRanges,
      restCoordinates: getRestCoordinates(options.deformer),
      values: options.values,
    }),
    channels.rest.curveHandles.length === 0
      ? channels.rest.curveHandles
      : sampleParameterCoordinates({
          binding: options.binding,
          keyformCoordinates: channels.curveHandles,
          repeatRanges: options.repeatRanges,
          restCoordinates: channels.rest.curveHandles,
          values: options.values,
        }),
    sampleParameterCoordinates({
      binding: options.binding,
      keyformCoordinates: channels.rotationOrigin,
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
  const rest = getDeformerRest(deformer)
  const restCoordinates = rest.coordinates
  const restCurveHandleCoordinates = rest.curveHandles
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
  const restRotationScale = rest.rotationScale
  let rotationScale: ReadonlyArray<number> = restRotationScale
  const restReflection = rest.rotationReflection
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
