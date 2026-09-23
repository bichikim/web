const MINIMUM_STRENGTH = 0.5
const MAXIMUM_STRENGTH = 1.5
const WEIGHT_TOLERANCE = 0.00001
import type {PuppetPart, PuppetSceneNode} from '../document'
import {getSkinFrames, invertSkinMatrix} from '../../deformation/skinning'
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null
const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const isMatrix = (value: unknown): value is import('../document').PuppetSkinMatrix =>
  isRecord(value) && ['xx', 'yx', 'xy', 'yy', 'x', 'y'].every((key) => isFiniteNumber(value[key]))

const hasValidOptions = (value: Record<string, unknown>): boolean => {
  const MINIMUM_RANGE = 0.25
  const MAXIMUM_RANGE = 3
  return (
    (value.mode === undefined || value.mode === 'joint' || value.mode === 'smooth') &&
    (value.range === undefined ||
      (isFiniteNumber(value.range) &&
        value.range >= MINIMUM_RANGE &&
        value.range <= MAXIMUM_RANGE)) &&
    (value.syncSeams === undefined || typeof value.syncSeams === 'boolean')
  )
}

export const hasValidSkinning = (
  nodes: ReadonlyArray<PuppetSceneNode>,
  parts: ReadonlyArray<PuppetPart>,
): boolean => {
  const frames = getSkinFrames(nodes)
  const visit = (children: ReadonlyArray<PuppetSceneNode>): boolean =>
    children.every((node) => {
      if (node.kind !== 'part') {
        return visit(node.children)
      }
      const skinning: unknown = node.skinning
      if (skinning === undefined) {
        return true
      }
      if (
        !frames.has(node.id) ||
        !isRecord(skinning) ||
        !hasValidOptions(skinning) ||
        !isMatrix(skinning.bind) ||
        invertSkinMatrix(skinning.bind) === undefined ||
        !Array.isArray(skinning.influences) ||
        skinning.influences.length < 2
      ) {
        return false
      }
      const count = (parts.find((part) => part.id === node.id)?.mesh.vertices.length ?? 0) / 2
      const seen = new Set<string>()
      const totals = Array.from({length: count}, () => 0)
      return (
        skinning.influences.every((influence: unknown) => {
          if (
            !isRecord(influence) ||
            typeof influence.nodeId !== 'string' ||
            (influence.strength !== undefined &&
              (!isFiniteNumber(influence.strength) ||
                influence.strength < MINIMUM_STRENGTH ||
                influence.strength > MAXIMUM_STRENGTH)) ||
            seen.has(influence.nodeId) ||
            !isMatrix(influence.inverseBind) ||
            invertSkinMatrix(influence.inverseBind) === undefined ||
            !Array.isArray(influence.weights) ||
            influence.weights.length !== count
          ) {
            return false
          }
          const target = frames.get(influence.nodeId)?.node
          if (target?.kind !== 'deformer' || target.deformerType !== 'rotation') {
            return false
          }
          seen.add(influence.nodeId)
          return influence.weights.every((weight: unknown, index: number) => {
            if (!isFiniteNumber(weight) || weight < 0 || weight > 1) {
              return false
            }
            totals[index] = (totals[index] ?? 0) + weight
            return true
          })
        }) && totals.every((total) => Math.abs(total - 1) < WEIGHT_TOLERANCE)
      )
    })
  return visit(nodes)
}
