import {getDeformerRotationOrigin} from './deformer-transform'
import {getDocumentScene, type PuppetDocument, type PuppetSceneDeformerNode} from '../../player'
import {isTwoDimensionalParameterBinding} from '../../deformation'
import {findNode, findNodeLock, updateNode} from './scene-tree'

const COORDINATES = 2
const CUBIC_DEGREE = 3
const MAXIMUM_SEGMENTS = 32

export interface EditCurveTopologyOptions {
  readonly document: PuppetDocument
  readonly nodeId: string
  readonly operation: 'split' | 'remove'
  readonly index: number
  readonly ratio?: number
}

const interpolate = (left: readonly number[], right: readonly number[], ratio: number) =>
  left.map((value, index) => value + (right[index]! - value) * ratio)

const splitCoordinates = (coordinates: readonly number[], segment: number, ratio: number) => {
  const offset = segment * CUBIC_DEGREE * COORDINATES
  const points = Array.from({length: CUBIC_DEGREE + 1}, (_, index) =>
    coordinates.slice(offset + index * COORDINATES, offset + (index + 1) * COORDINATES),
  )
  const first = interpolate(points[0]!, points[1]!, ratio)
  const middle = interpolate(points[1]!, points[2]!, ratio)
  const last = interpolate(points[2]!, points[CUBIC_DEGREE]!, ratio)
  const left = interpolate(first, middle, ratio)
  const right = interpolate(middle, last, ratio)
  return [
    ...coordinates.slice(0, offset),
    ...points[0]!,
    ...first,
    ...left,
    ...interpolate(left, right, ratio),
    ...right,
    ...last,
    ...coordinates.slice(offset + CUBIC_DEGREE * COORDINATES),
  ]
}

const mergeCoordinates = (coordinates: readonly number[], knot: number, ratio: number) => {
  const start = (knot - 1) * CUBIC_DEGREE * COORDINATES
  const end = (knot + 1) * CUBIC_DEGREE * COORDINATES
  const outgoing = [0, 1].map(
    (axis) =>
      coordinates[start + axis]! +
      (coordinates[start + COORDINATES + axis]! - coordinates[start + axis]!) / ratio,
  )
  const incoming = [0, 1].map(
    (axis) =>
      coordinates[end + axis]! +
      (coordinates[end - COORDINATES + axis]! - coordinates[end + axis]!) / (1 - ratio),
  )
  return [
    ...coordinates.slice(0, start + COORDINATES),
    ...outgoing,
    ...incoming,
    ...coordinates.slice(end),
  ]
}

export const editCurveTopology = (
  options: EditCurveTopologyOptions,
): PuppetDocument | undefined => {
  const scene = getDocumentScene(options.document)
  const node = findNode(scene.roots, options.nodeId)
  if (
    node?.kind !== 'deformer' ||
    node.curveAxis === undefined ||
    findNodeLock(scene.roots, node.id) ||
    !Number.isInteger(options.index)
  ) {
    return undefined
  }
  const breaks = node.curveBreaks ?? [0, 1]
  const segments = breaks.length - 1
  if (
    options.operation === 'split'
      ? options.index < 0 || options.index >= segments || segments >= MAXIMUM_SEGMENTS
      : options.index <= 0 || options.index >= segments
  ) {
    return undefined
  }
  const DEFAULT_SPLIT_RATIO = 0.5
  const ratio = options.ratio ?? DEFAULT_SPLIT_RATIO
  if (!Number.isFinite(ratio) || ratio <= 0 || ratio >= 1) {
    return undefined
  }
  const nextBreaks = [...breaks]
  let update: (coordinates: readonly number[]) => number[]
  if (options.operation === 'split') {
    nextBreaks.splice(
      options.index + 1,
      0,
      breaks[options.index]! + (breaks[options.index + 1]! - breaks[options.index]!) * ratio,
    )
    update = (coordinates) => splitCoordinates(coordinates, options.index, ratio)
  } else {
    const ratio =
      (breaks[options.index]! - breaks[options.index - 1]!) /
      (breaks[options.index + 1]! - breaks[options.index - 1]!)
    nextBreaks.splice(options.index, 1)
    update = (coordinates) => mergeCoordinates(coordinates, options.index, ratio)
  }
  const nextNode: PuppetSceneDeformerNode = {
    ...node,
    controlPoints: update(node.controlPoints),
    curveBreaks: nextBreaks,
    rotationOrigin: getDeformerRotationOrigin(node),
  }
  return {
    ...options.document,
    parameterBindings: options.document.parameterBindings?.map((binding) => {
      const updateKeyform = <Keyform extends (typeof binding.keyforms)[number]>(
        keyform: Keyform,
      ): Keyform => ({
        ...keyform,
        deformers: keyform.deformers?.map((deformer) =>
          deformer.nodeId === node.id
            ? {...deformer, controlPoints: update(deformer.controlPoints)}
            : deformer,
        ),
      })
      return isTwoDimensionalParameterBinding(binding)
        ? {...binding, keyforms: binding.keyforms.map(updateKeyform)}
        : {...binding, keyforms: binding.keyforms.map(updateKeyform)}
    }),
    scene: {...scene, roots: updateNode(scene.roots, node.id, () => nextNode)},
  }
}
