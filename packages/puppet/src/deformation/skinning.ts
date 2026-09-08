import {blendRigidTransforms, type WeightedRigidTransform} from './rigid-blend'
import type {
  PuppetPoint,
  PuppetSceneNode,
  PuppetSkinBinding,
  PuppetSkinMatrix,
  PuppetSkinOptions,
} from '../player/document'
import {transformDeformerPoint} from './grid'

const IDENTITY: PuppetSkinMatrix = {x: 0, xx: 1, xy: 0, y: 0, yx: 0, yy: 1}
const EPSILON = 0.00000001

export const transformSkinPoint = (matrix: PuppetSkinMatrix, point: PuppetPoint): PuppetPoint => ({
  x: matrix.xx * point.x + matrix.xy * point.y + matrix.x,
  y: matrix.yx * point.x + matrix.yy * point.y + matrix.y,
})

export const multiplySkinMatrices = (
  parent: PuppetSkinMatrix,
  child: PuppetSkinMatrix,
): PuppetSkinMatrix => ({
  xx: parent.xx * child.xx + parent.xy * child.yx,
  xy: parent.xx * child.xy + parent.xy * child.yy,
  yx: parent.yx * child.xx + parent.yy * child.yx,
  yy: parent.yx * child.xy + parent.yy * child.yy,
  ...transformSkinPoint(parent, {x: child.x, y: child.y}),
})

export const invertSkinMatrix = (matrix: PuppetSkinMatrix): PuppetSkinMatrix | undefined => {
  const determinant = matrix.xx * matrix.yy - matrix.yx * matrix.xy
  if (Math.abs(determinant) < EPSILON) {
    return undefined
  }
  return {
    x: (matrix.xy * matrix.y - matrix.yy * matrix.x) / determinant,
    xx: matrix.yy / determinant,
    xy: -matrix.xy / determinant,
    y: (matrix.yx * matrix.x - matrix.xx * matrix.y) / determinant,
    yx: -matrix.yx / determinant,
    yy: matrix.xx / determinant,
  }
}

export interface SkinFrame {
  readonly node: PuppetSceneNode
  readonly ancestors: ReadonlyArray<string>
  readonly matrix: PuppetSkinMatrix
}

/** Returns affine frames for group and rotation-only ancestor paths. */
export const getSkinFrames = (
  nodes: ReadonlyArray<PuppetSceneNode>,
): ReadonlyMap<string, SkinFrame> => {
  const frames = new Map<string, SkinFrame>()
  const visit = (
    children: ReadonlyArray<PuppetSceneNode>,
    parent: PuppetSkinMatrix,
    ancestors: ReadonlyArray<string>,
  ) => {
    children.forEach((node) => {
      let matrix = parent
      if (node.kind === 'deformer') {
        const {binding} = node
        if (
          node.deformerType !== 'rotation' ||
          (binding !== undefined &&
            (binding.rest.deformerType !== 'rotation' ||
              binding.steps.some(
                (step) =>
                  step.shape.deformerType !== 'rotation' ||
                  (step.rest !== undefined && step.rest.deformerType !== 'rotation'),
              )))
        ) {
          return
        }
        const origin = transformDeformerPoint(node, {x: 0, y: 0})
        const horizontal = transformDeformerPoint(node, {x: 1, y: 0})
        const vertical = transformDeformerPoint(node, {x: 0, y: 1})
        matrix = multiplySkinMatrices(parent, {
          xx: horizontal.x - origin.x,
          xy: vertical.x - origin.x,
          yx: horizontal.y - origin.y,
          yy: vertical.y - origin.y,
          ...origin,
        })
      }
      frames.set(node.id, {ancestors, matrix, node})
      if (node.kind !== 'part') {
        visit(node.children, matrix, [...ancestors, node.id])
      }
    })
  }
  visit(nodes, IDENTITY, [])
  return frames
}

const hasJointSamples = (
  frames: ReadonlyMap<string, SkinFrame>,
  part: SkinFrame,
  vertices: ReadonlyArray<number>,
): boolean => {
  const MINIMUM_VERTICES = 6
  if (vertices.length / 2 < MINIMUM_VERTICES) {
    return false
  }
  const owner = [...part.ancestors]
    .reverse()
    .map((id) => frames.get(id))
    .find((frame) => frame?.node.kind === 'deformer')
  const joints = owner?.node.kind === 'deformer' ? owner.node.boneRestPoints : undefined
  const inverse = owner === undefined ? undefined : invertSkinMatrix(owner.matrix)
  if (joints === undefined || inverse === undefined) {
    return false
  }
  const endOffset = 2
  const dx = joints[endOffset]! - joints[0]!
  const dy = joints[endOffset + 1]! - joints[1]!
  const lengthSquared = dx * dx + dy * dy
  if (lengthSquared <= EPSILON) {
    return false
  }
  const coordinates = Array.from({length: vertices.length / 2}, (_, index) => {
    const point = transformSkinPoint(
      inverse,
      transformSkinPoint(part.matrix, {x: vertices[index * 2]!, y: vertices[index * 2 + 1]!}),
    )
    return ((point.x - joints[0]!) * dx + (point.y - joints[1]!) * dy) / lengthSquared
  }).sort((left, right) => left - right)
  const SAMPLE_TOLERANCE = 0.0001
  const MINIMUM_SECTIONS = 3
  const distinct = coordinates.filter(
    (value, index) => index === 0 || Math.abs(value - coordinates[index - 1]!) > SAMPLE_TOLERANCE,
  )
  return distinct.length >= MINIMUM_SECTIONS && distinct.some((value) => value > 0 && value < 1)
}

interface AutomaticWeightOptions {
  readonly frames: ReadonlyMap<string, SkinFrame>
  readonly part: SkinFrame
  readonly nodeIds: ReadonlyArray<string>
  readonly point: PuppetPoint
  readonly jointSamples: boolean
  readonly options?: PuppetSkinOptions
}

const getAutomaticWeights = (options: AutomaticWeightOptions): ReadonlyArray<number> => {
  const {frames, part, nodeIds, point, jointSamples} = options
  if (options.options?.mode === 'smooth') {
    const distances = nodeIds.map((id) => {
      const frame = frames.get(id)
      if (frame?.node.kind !== 'deformer' || frame.node.boneRestPoints === undefined) {
        return {distance: Infinity, radius: 1}
      }
      const rest = frame.node.boneRestPoints
      const start = transformSkinPoint(frame.matrix, {x: rest[0]!, y: rest[1]!})
      const end = transformSkinPoint(frame.matrix, {x: rest[2]!, y: rest[3]!})
      return {
        distance: Math.hypot(point.x - (start.x + end.x) / 2, point.y - (start.y + end.y) / 2),
        radius: Math.max(EPSILON, Math.hypot(end.x - start.x, end.y - start.y)),
      }
    })
    const values = distances.map(({distance, radius}) => {
      const t = distance / (radius * (options.options?.range ?? 1))
      if (t >= 2) {
        return 0
      }
      const CUBIC = 3
      const DIVISOR = 6
      const CENTER = 4
      return t < 1
        ? (CENTER - DIVISOR * t * t + CUBIC * t ** CUBIC) / DIVISOR
        : (2 - t) ** CUBIC / DIVISOR
    })
    if (values.some((value) => value > 0)) {
      return values
    }
    const nearest = distances.reduce(
      (best, item, index) => (item.distance < distances[best]!.distance ? index : best),
      0,
    )
    return values.map((_, index) => (index === nearest ? 1 : 0))
  }
  const owner = [...part.ancestors]
    .reverse()
    .map((id) => frames.get(id))
    .find((frame) => frame?.node.kind === 'deformer')
  const ownerIndex = owner === undefined ? -1 : nodeIds.indexOf(owner.node.id)
  if (owner !== undefined && ownerIndex >= 0 && owner.node.kind === 'deformer') {
    const parentId = [...owner.ancestors].reverse().find((id) => nodeIds.includes(id))
    const parentIndex = parentId === undefined ? -1 : nodeIds.indexOf(parentId)
    const inverse = invertSkinMatrix(owner.matrix)
    const joints = owner.node.boneRestPoints
    if (jointSamples && inverse !== undefined && joints !== undefined) {
      const local = transformSkinPoint(inverse, point)
      const endOffset = 2
      const startX = joints[0]!
      const startY = joints[1]!
      const dx = joints[endOffset]! - startX
      const dy = joints[endOffset + 1]! - startY
      const lengthSquared = dx * dx + dy * dy
      const progress =
        lengthSquared <= EPSILON
          ? 1
          : ((local.x - startX) * dx + (local.y - startY) * dy) / lengthSquared
      const JOINT_BLEND_RATIO = 0.5
      const children = nodeIds.filter((id) => {
        const child = frames.get(id)
        if (child?.node.kind !== 'deformer' || child.node.boneRestPoints === undefined) {
          return false
        }
        const ancestor = [...child.ancestors]
          .reverse()
          .find((ancestorId) => frames.get(ancestorId)?.node.kind === 'deformer')
        const pivot = transformSkinPoint(
          inverse,
          transformSkinPoint(child.matrix, {
            x: child.node.boneRestPoints[0]!,
            y: child.node.boneRestPoints[1]!,
          }),
        )
        const JOINT_TOLERANCE = 0.0001
        return (
          ancestor === owner.node.id &&
          Math.hypot(pivot.x - joints[2]!, pivot.y - joints[3]!) <=
            Math.max(1, Math.sqrt(lengthSquared)) * JOINT_TOLERANCE
        )
      })
      const parentWeight =
        parentIndex < 0 ? 0 : Math.max(0, Math.min(JOINT_BLEND_RATIO, JOINT_BLEND_RATIO - progress))
      const childWeight =
        children.length === 0
          ? 0
          : Math.max(0, Math.min(JOINT_BLEND_RATIO, progress - JOINT_BLEND_RATIO))
      return nodeIds.map((id, index) => {
        if (index === ownerIndex) {
          return 1 - parentWeight - childWeight
        }
        if (index === parentIndex) {
          return parentWeight
        }
        return children.includes(id) ? childWeight / children.length : 0
      })
    }
    return nodeIds.map((_, index) => (index === ownerIndex ? 1 : 0))
  }
  return nodeIds.map((id) => {
    const frame = frames.get(id)!
    const rest = frame.node.kind === 'deformer' ? frame.node.boneRestPoints : undefined
    const pivot = transformSkinPoint(frame.matrix, {x: rest?.[0] ?? 0, y: rest?.[1] ?? 0})
    return 1 / Math.max(1, Math.hypot(point.x - pivot.x, point.y - pivot.y)) ** 2
  })
}

/** Recomputes weights in the stored binding pose without rebinding the current pose. */
export const resetSkinWeights = (
  nodes: ReadonlyArray<PuppetSceneNode>,
  partId: string,
  vertices: ReadonlyArray<number>,
): PuppetSkinBinding | undefined => {
  const frames = new Map(getSkinFrames(nodes))
  const part = frames.get(partId)
  const binding = part?.node.kind === 'part' ? part.node.skinning : undefined
  if (part === undefined || binding === undefined) {
    return undefined
  }
  const boundPart = {...part, matrix: binding.bind}
  frames.set(partId, boundPart)
  for (const influence of binding.influences) {
    const frame = frames.get(influence.nodeId)
    const matrix = invertSkinMatrix(influence.inverseBind)
    if (frame === undefined || matrix === undefined) {
      return undefined
    }
    frames.set(influence.nodeId, {...frame, matrix})
  }
  const jointSamples = hasJointSamples(frames, boundPart, vertices)
  const nodeIds = binding.influences.map((influence) => influence.nodeId)
  const weights = Array.from({length: vertices.length / 2}, (_, index) => {
    const point = transformSkinPoint(binding.bind, {
      x: vertices[index * 2]!,
      y: vertices[index * 2 + 1]!,
    })
    const values = getAutomaticWeights({
      frames,
      jointSamples,
      nodeIds,
      options: binding,
      part: boundPart,
      point,
    })
    const total = values.reduce((sum, value) => sum + value, 0)
    return values.map((value) => value / total)
  })
  return {
    ...binding,
    influences: binding.influences.map((influence, index) => ({
      ...influence,
      strength: undefined,
      weights: weights.map((value) => value[index]!),
    })),
  }
}

interface CreateSkinOptions {
  readonly nodes: ReadonlyArray<PuppetSceneNode>
  readonly partId: string
  readonly nodeIds: ReadonlyArray<string>
  readonly vertices: ReadonlyArray<number>
  readonly options?: PuppetSkinOptions
}

export const createSkinBinding = (
  nodes: ReadonlyArray<PuppetSceneNode>,
  partId: string,
  nodeIds: ReadonlyArray<string>,
  vertices: ReadonlyArray<number>,
): PuppetSkinBinding | undefined => createConfiguredSkinBinding({nodeIds, nodes, partId, vertices})

export const createConfiguredSkinBinding = (
  input: CreateSkinOptions,
): PuppetSkinBinding | undefined => {
  const {nodes, partId, nodeIds, vertices, options} = input
  const frames = getSkinFrames(nodes)
  const part = frames.get(partId)
  const targets = [...new Set(nodeIds)].map((id) => frames.get(id))
  if (
    part?.node.kind !== 'part' ||
    targets.length < 2 ||
    targets.some(
      (frame) => frame?.node.kind !== 'deformer' || frame.node.deformerType !== 'rotation',
    )
  ) {
    return undefined
  }
  const influences = targets.flatMap((frame) => {
    if (frame === undefined || frame.node.kind !== 'deformer') {
      return []
    }
    const inverseBind = invertSkinMatrix(frame.matrix)
    return inverseBind === undefined
      ? []
      : [{inverseBind, nodeId: frame.node.id, weights: [] as number[]}]
  })
  if (influences.length !== targets.length) {
    return undefined
  }
  const jointSamples = hasJointSamples(frames, part, vertices)
  for (let index = 0; index < vertices.length; index += 2) {
    const point = transformSkinPoint(part.matrix, {x: vertices[index]!, y: vertices[index + 1]!})
    const weights = getAutomaticWeights({
      frames,
      jointSamples,
      nodeIds: influences.map((influence) => influence.nodeId),
      options,
      part,
      point,
    })
    const total = weights.reduce((sum, weight) => sum + weight, 0)
    influences.forEach((influence, target) => influence.weights.push(weights[target]! / total))
  }
  return {
    ...options,
    bind: part.matrix,
    influences: influences.map(({nodeId, inverseBind, weights}) => ({
      inverseBind,
      nodeId,
      weights,
    })),
  }
}

export const getSkinMatrix = (
  nodes: ReadonlyArray<PuppetSceneNode>,
  binding: PuppetSkinBinding,
  vertexIndex: number,
): PuppetSkinMatrix | undefined => blendSkinMatrix(getSkinFrames(nodes), binding, vertexIndex)

export const blendSkinMatrix = (
  frames: ReadonlyMap<string, SkinFrame>,
  binding: PuppetSkinBinding,
  vertexIndex: number,
): PuppetSkinMatrix | undefined => {
  const transforms: WeightedRigidTransform[] = []
  for (const influence of binding.influences) {
    const frame = frames.get(influence.nodeId)
    const weight = influence.weights[vertexIndex] ?? 0
    if (frame?.node.kind === 'deformer' && frame.node.deformerType === 'rotation' && weight > 0) {
      const matrix = multiplySkinMatrices(
        multiplySkinMatrices(frame.matrix, influence.inverseBind),
        binding.bind,
      )
      transforms.push({matrix, weight})
    }
  }
  return blendRigidTransforms(transforms)
}
