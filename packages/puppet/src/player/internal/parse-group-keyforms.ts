import type {PuppetParameterBinding, PuppetScene, PuppetSceneNode} from '../document'
import {hasValidTargetIds, isPartRenderProperties} from './parse-part-properties'

const KEYED_PROPERTIES: ReadonlySet<string> = new Set([
  'drawOrder',
  'multiplyColor',
  'opacity',
  'screenColor',
])

/** Groups that sort as one draw order unit: with a draw order, or offscreen. */
const collectDrawOrderGroupIds = (nodes: ReadonlyArray<PuppetSceneNode>, ids: Set<string>) => {
  for (const node of nodes) {
    if (node.kind !== 'part') {
      if (
        node.kind === 'group' &&
        (node.properties?.drawOrder !== undefined || node.properties?.offscreen === true)
      ) {
        ids.add(node.id)
      }
      collectDrawOrderGroupIds(node.children, ids)
    }
  }
  return ids
}

/** IDs of every scene group. */
export const getSceneGroupIds = (scene: PuppetScene | undefined): ReadonlySet<string> =>
  collectGroupIds(scene?.roots ?? [], new Set())

const collectGroupIds = (nodes: ReadonlyArray<PuppetSceneNode>, ids: Set<string>) => {
  for (const node of nodes) {
    if (node.kind !== 'part') {
      if (node.kind === 'group') {
        ids.add(node.id)
      }
      collectGroupIds(node.children, ids)
    }
  }
  return ids
}

const isKeyedProperties = (value: unknown) =>
  isPartRenderProperties(value) && Object.keys(value).every((key) => KEYED_PROPERTIES.has(key))

/**
 * Group keyforms: distinct `targetGroupIds` naming scene groups, and in every keyform exactly
 * one entry per target group with only opacity, colors and (for draw order groups) draw order.
 */
export const hasValidGroupKeyforms = (
  bindings: ReadonlyArray<PuppetParameterBinding>,
  scene: PuppetScene | undefined,
) => {
  const groupIds = collectGroupIds(scene?.roots ?? [], new Set())
  const drawOrderGroupIds = collectDrawOrderGroupIds(scene?.roots ?? [], new Set())
  return bindings.every((binding) => {
    const targets = binding.targetGroupIds ?? []
    const targetSet = new Set(targets)
    return (
      hasValidTargetIds(binding.targetGroupIds) &&
      targets.every((groupId) => groupIds.has(groupId)) &&
      binding.keyforms.every((keyform) => {
        const groups: ReadonlyArray<unknown> = Array.isArray(keyform.groups) ? keyform.groups : []
        return (
          (keyform.groups === undefined || Array.isArray(keyform.groups)) &&
          groups.length === targets.length &&
          groups.every(
            (entry) =>
              typeof entry === 'object' &&
              entry !== null &&
              'groupId' in entry &&
              'properties' in entry &&
              typeof entry.groupId === 'string' &&
              targetSet.has(entry.groupId) &&
              isKeyedProperties(entry.properties) &&
              // Only draw order groups have a draw order to key.
              ((entry.properties as {drawOrder?: unknown}).drawOrder === undefined ||
                drawOrderGroupIds.has(entry.groupId)),
          ) &&
          new Set(keyform.groups?.map((entry) => entry.groupId)).size === groups.length
        )
      })
    )
  })
}
