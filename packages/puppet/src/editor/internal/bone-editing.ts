import {isDeformerRestEditable} from './deformer-placement'
import {rebindDeformer} from '../../deformation/binding'
const COORDINATES = 2
const MINIMUM_COORDINATES = 4
import {
  getDocumentScene,
  type PuppetDocument,
  type PuppetPoint,
  type PuppetSceneDeformerNode,
} from '../../player'
import {createCurveDeformer} from './scene-graph'
import {findNode, updateNode} from './scene-tree'

export const createBoneDeformer = (
  document: PuppetDocument,
  nodeIds: readonly string[],
): PuppetDocument | undefined => {
  const wrapped = createCurveDeformer(document, nodeIds)
  if (wrapped === undefined) {
    return undefined
  }
  const before = new Set<string>()
  const collect = (nodes: ReturnType<typeof getDocumentScene>['roots']) => {
    for (const node of nodes) {
      before.add(node.id)
      if (node.kind !== 'part') {
        collect(node.children)
      }
    }
  }
  collect(getDocumentScene(document).roots)
  let created: PuppetSceneDeformerNode | undefined
  const locate = (nodes: ReturnType<typeof getDocumentScene>['roots']) => {
    for (const node of nodes) {
      if (!before.has(node.id) && node.kind === 'deformer') {
        created = node
      }
      if (node.kind !== 'part') {
        locate(node.children)
      }
    }
  }
  const scene = getDocumentScene(wrapped)
  locate(scene.roots)
  if (created === undefined) {
    return undefined
  }
  let id = 'bone'
  let suffix = 1
  while (before.has(id)) {
    id = `bone-${suffix}`
    suffix += 1
  }
  const points = [
    ...created.controlPoints.slice(0, 2),
    ...created.controlPoints.slice(-COORDINATES),
  ]
  const node: PuppetSceneDeformerNode = {
    ...created,
    boneRestPoints: points,
    controlPoints: points,
    curveAxis: undefined,
    id,
    name: '새 본 디포머',
  }
  return {...wrapped, scene: {...scene, roots: updateNode(scene.roots, created.id, () => node)}}
}

export interface EditBoneRestOptions {
  readonly document: PuppetDocument
  readonly nodeId: string
  readonly operation: 'move' | 'append' | 'remove' | 'insert'
  readonly index?: number
  readonly point?: PuppetPoint
}

export const editBoneRest = (options: EditBoneRestOptions): PuppetDocument | undefined => {
  const scene = getDocumentScene(options.document)
  const node = findNode(scene.roots, options.nodeId)
  if (
    node?.kind !== 'deformer' ||
    node.boneRestPoints === undefined ||
    !isDeformerRestEditable(options.document, node.id)
  ) {
    return undefined
  }
  const points = [...node.boneRestPoints]
  const index = options.index ?? points.length / 2 - 1
  const MAXIMUM_JOINTS = 33
  if (!Number.isInteger(index) || index < 0 || index >= points.length / 2) {
    return undefined
  }
  switch (options.operation) {
    case 'move':
    case 'append': {
      const {point} = options
      if (!isFinitePoint(point)) {
        return undefined
      }
      if (options.operation === 'append') {
        if (points.length / 2 >= MAXIMUM_JOINTS) {
          return undefined
        }
        points.push(point.x, point.y)
      } else {
        points.splice(index * 2, 2, point.x, point.y)
      }
      break
    }
    case 'insert': {
      const inserted = insertBoneJoint(points, index, options.point)
      if (inserted === undefined) {
        return undefined
      }
      points.splice(index * 2, 0, inserted.x, inserted.y)
      break
    }
    case 'remove':
      if (points.length <= MINIMUM_COORDINATES || index === 0) {
        return undefined
      }
      points.splice(index * 2, 2)
      break
    default: {
      const exhaustive: never = options.operation
      return exhaustive
    }
  }
  const MINIMUM_LENGTH = 0.001
  if (
    points.some(
      (value, offset) =>
        offset >= 2 &&
        offset % 2 === 0 &&
        Math.hypot(value - points[offset - 2]!, points[offset + 1]! - points[offset - 1]!) <
          MINIMUM_LENGTH,
    )
  ) {
    return undefined
  }
  return {
    ...options.document,
    scene: {
      ...scene,
      roots: updateNode(scene.roots, node.id, () =>
        rebindDeformer(node, {
          ...node,
          boneRestPoints: points,
          controlPoints: points,
        }),
      ),
    },
  }
}

const insertBoneJoint = (
  points: readonly number[],
  index: number,
  point: PuppetPoint | undefined,
): PuppetPoint | undefined => {
  const MAXIMUM_COORDINATES = 66
  if (
    index === 0 ||
    points.length >= MAXIMUM_COORDINATES ||
    point === undefined ||
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.y)
  ) {
    return undefined
  }
  const x = points[(index - 1) * 2]!
  const y = points[(index - 1) * 2 + 1]!
  const dx = points[index * 2]! - x
  const dy = points[index * 2 + 1]! - y
  const ratio = Math.max(
    0,
    Math.min(1, ((point.x - x) * dx + (point.y - y) * dy) / (dx * dx + dy * dy)),
  )
  return {x: x + dx * ratio, y: y + dy * ratio}
}

const isFinitePoint = (point: PuppetPoint | undefined): point is PuppetPoint =>
  point !== undefined && Number.isFinite(point.x) && Number.isFinite(point.y)
