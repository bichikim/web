import {mapBindingKeyforms} from '../../deformation'
import {
  getDocumentScene,
  PUPPET_DEFAULT_DRAW_ORDER,
  type PuppetDocument,
  type PuppetGroupRenderProperties,
  type PuppetSceneGroupNode,
} from '../../player'
import {getSceneNode} from './scene-graph'
import {updateNode} from './scene-tree'

/** Properties that composite an isolated layer, so they exist only on offscreen groups. */
const OFFSCREEN_PROPERTIES: ReadonlySet<string> = new Set([
  'alphaBlendMode',
  'blendMode',
  'clippingMaskIds',
  'invertedMask',
])

export const getSceneGroup = (
  document: PuppetDocument,
  groupId: string | undefined,
): PuppetSceneGroupNode | undefined => {
  const node = groupId === undefined ? undefined : getSceneNode(document, groupId)
  return node?.kind === 'group' ? node : undefined
}

/**
 * The document's bindings without the keyed draw orders of `groupId`, which only draw order
 * groups can have.
 */
const removeKeyedDrawOrders = (document: PuppetDocument, groupId: string) =>
  document.parameterBindings?.map((binding) =>
    mapBindingKeyforms(binding, (keyform) => ({
      ...keyform,
      groups: keyform.groups?.map((entry) => {
        if (entry.groupId !== groupId) {
          return entry
        }
        const {drawOrder: _keyed, ...keyedProperties} = entry.properties
        return {...entry, properties: keyedProperties}
      }),
    })),
  )

/** Whether the group sorts as one draw order unit, so its draw order can be keyed. */
const isDrawOrderUnit = (properties: PuppetGroupRenderProperties) =>
  properties.drawOrder !== undefined || properties.offscreen === true

/**
 * Merges `properties` into a group's render properties. Without `offscreen` the compositing
 * properties are dropped, since only an isolated layer can use them; a group left without a
 * draw order or `offscreen` also loses its keyed draw orders.
 */
export const setGroupRenderProperties = (
  document: PuppetDocument,
  groupId: string,
  properties: PuppetGroupRenderProperties,
): PuppetDocument | undefined => {
  const group = getSceneGroup(document, groupId)
  if (group === undefined) {
    return undefined
  }
  const merged = {...group.properties, ...properties}
  const next: PuppetGroupRenderProperties =
    merged.offscreen === true
      ? merged
      : Object.fromEntries(Object.entries(merged).filter(([key]) => !OFFSCREEN_PROPERTIES.has(key)))
  return {
    ...document,
    parameterBindings: isDrawOrderUnit(next)
      ? document.parameterBindings
      : removeKeyedDrawOrders(document, groupId),
    scene: {
      roots: updateNode(getDocumentScene(document).roots, groupId, (node) =>
        node.kind === 'group' ? {...node, properties: next} : node,
      ),
    },
  }
}

/**
 * Makes a group a draw order group at the default draw order, or plain again. Turning it off
 * also drops its keyed draw orders unless the group stays a draw-order unit (offscreen).
 */
export const setDrawOrderGroup = (
  document: PuppetDocument,
  groupId: string,
  enabled: boolean,
): PuppetDocument | undefined => {
  const group = getSceneGroup(document, groupId)
  if (group === undefined) {
    return undefined
  }
  const {drawOrder: _previous, ...properties} = group.properties ?? {}
  const next = enabled ? {...properties, drawOrder: PUPPET_DEFAULT_DRAW_ORDER} : properties
  return {
    ...document,
    // An offscreen group stays a draw-order unit, so its keyed draw orders stay valid.
    parameterBindings: isDrawOrderUnit(next)
      ? document.parameterBindings
      : removeKeyedDrawOrders(document, groupId),
    scene: {
      roots: updateNode(getDocumentScene(document).roots, groupId, (node) =>
        node.kind === 'group' ? {...node, properties: next} : node,
      ),
    },
  }
}
