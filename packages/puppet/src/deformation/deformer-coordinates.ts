import {getBoneChannels} from './bone'
import type {
  PuppetParameterBinding,
  PuppetParameterDeformerKeyform,
  PuppetPoint,
  PuppetSceneDeformerNode,
} from '../player/document'

const composeCoordinates = (
  deformer: PuppetSceneDeformerNode,
  coordinates: ReadonlyArray<number>,
  rotationAngle: number | undefined,
): ReadonlyArray<number> => {
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

export const getCurveHandleCoordinates = (
  handles: PuppetParameterDeformerKeyform['curveHandles'],
  deformer: PuppetSceneDeformerNode,
): ReadonlyArray<number> =>
  (deformer.curveHandles ?? []).flatMap((restHandle) => {
    const handle =
      handles?.find((candidate) => candidate.pointIndex === restHandle.pointIndex) ?? restHandle
    return [handle.horizontal.x, handle.horizontal.y, handle.vertical.x, handle.vertical.y]
  })

export interface DeformerRest {
  readonly coordinates: ReadonlyArray<number>
  readonly curveHandles: ReadonlyArray<number>
  readonly rotationOrigin: PuppetPoint
  readonly rotationScale: ReadonlyArray<number>
  readonly rotationReflection: ReadonlyArray<number>
}

const deformerRest = new WeakMap<PuppetSceneDeformerNode, DeformerRest>()

/** Borrows immutable rest channels; dynamic poses use their own node identity. */
export const getDeformerRest = (deformer: PuppetSceneDeformerNode): DeformerRest => {
  const previous = deformerRest.get(deformer)
  if (previous !== undefined) {
    return previous
  }
  const {controlPoints} = deformer
  const pointCount = controlPoints.length / 2
  let x = 0
  let y = 0
  if (deformer.rotationOrigin === undefined) {
    for (let index = 0; index < controlPoints.length; index += 2) {
      x += controlPoints[index] ?? 0
      y += controlPoints[index + 1] ?? 0
    }
  }
  const result: DeformerRest = {
    coordinates: getDeformerCoordinates(deformer, controlPoints, deformer.rotationAngle),
    curveHandles: getCurveHandleCoordinates(deformer.curveHandles, deformer),
    rotationOrigin: deformer.rotationOrigin ?? {x: x / pointCount, y: y / pointCount},
    rotationReflection: (deformer.rotationReflection ?? [false, false]).map(Number),
    rotationScale: [deformer.rotationScale ?? 1],
  }
  deformerRest.set(deformer, result)
  return result
}

const restCoordinates = new WeakMap<PuppetSceneDeformerNode, ReadonlyArray<number>>()

/** Borrows immutable bone channels; only the owner's unmodified rest input is memoized. */
export const getDeformerCoordinates = (
  deformer: PuppetSceneDeformerNode,
  coordinates: ReadonlyArray<number>,
  rotationAngle?: number,
): ReadonlyArray<number> => {
  const rest =
    coordinates === deformer.controlPoints && Object.is(rotationAngle, deformer.rotationAngle)
  const previous = rest ? restCoordinates.get(deformer) : undefined
  if (previous !== undefined) {
    return previous
  }
  const result = composeCoordinates(deformer, coordinates, rotationAngle)
  if (rest) {
    restCoordinates.set(deformer, result)
  }
  return result
}

const getKeyCoordinates = (
  keyed: PuppetParameterDeformerKeyform | undefined,
  deformer: PuppetSceneDeformerNode,
): ReadonlyArray<number> | undefined => {
  if (keyed === undefined || keyed.controlPoints === undefined) {
    return undefined
  }
  const coordinates = keyed.controlPoints
  const sampled = getDeformerCoordinates(deformer, coordinates, keyed.rotationAngle)
  if (deformer.boneRestPoints === undefined || keyed.rotationAngle !== undefined) {
    return sampled
  }
  const reference = getDeformerCoordinates(deformer, deformer.controlPoints, deformer.rotationAngle)
  return sampled.map((value, index) => {
    if (index < 2) {
      return value
    }
    const center = reference[index] ?? 0
    const offset = value - center
    return center + Math.atan2(Math.sin(offset), Math.cos(offset))
  })
}

export interface DeformerKeyforms {
  readonly coordinates: ReadonlyArray<ReadonlyArray<number> | undefined>
  readonly curveHandles: ReadonlyArray<ReadonlyArray<number>>
  readonly rotationOrigin: ReadonlyArray<ReadonlyArray<number>>
  readonly rotationScale: ReadonlyArray<ReadonlyArray<number>>
  readonly rotationReflection: ReadonlyArray<ReadonlyArray<number>>
  readonly rest: DeformerRest
}

const keyformChannels = new WeakMap<
  PuppetSceneDeformerNode,
  WeakMap<PuppetParameterBinding, DeformerKeyforms>
>()

/** Borrows prepared immutable keyform channels, retaining no frame inputs or sampled poses. */
export const getDeformerKeyforms = (
  binding: PuppetParameterBinding,
  deformer: PuppetSceneDeformerNode,
): DeformerKeyforms => {
  let bindings = keyformChannels.get(deformer)
  if (bindings === undefined) {
    bindings = new WeakMap()
    keyformChannels.set(deformer, bindings)
  }
  const previous = bindings.get(binding)
  if (previous !== undefined) {
    return previous
  }
  const forms = binding.keyforms.map((form) =>
    form.deformers?.find((candidate) => candidate.nodeId === deformer.id),
  )
  const rest = getDeformerRest(deformer)
  const result: DeformerKeyforms = {
    coordinates: forms.map((form) => getKeyCoordinates(form, deformer)),
    curveHandles: forms.map((form) => getCurveHandleCoordinates(form?.curveHandles, deformer)),
    rest,
    rotationOrigin: forms.map((form) => {
      const origin = form?.rotationOrigin ?? rest.rotationOrigin
      return [origin.x, origin.y]
    }),
    rotationReflection: forms.map((form) =>
      (form?.rotationReflection ?? deformer.rotationReflection ?? [false, false]).map(Number),
    ),
    rotationScale: forms.map((form) => [form?.rotationScale ?? deformer.rotationScale ?? 1]),
  }
  bindings.set(binding, result)
  return result
}
