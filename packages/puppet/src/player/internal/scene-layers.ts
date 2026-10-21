import {
  composeColorEffects,
  getContainerRenderProperties,
  IDENTITY_COLOR_EFFECT,
  type PuppetColorEffect,
  type ResolvedGroupRenderProperties,
} from '../../deformation'
import type {
  PuppetDocument,
  PuppetSceneContainerNode,
  PuppetSceneGroupNode,
  PuppetSceneNode,
} from '../document'
import {getDocumentScene, isSceneContainerNode} from '../scene'

export interface SceneLayer {
  /** Group and deformer ancestors, outermost first. */
  readonly ancestors: ReadonlyArray<PuppetSceneContainerNode>
  readonly group: PuppetSceneGroupNode
  /** Visible with every container above it. */
  readonly visible: boolean
}

export interface SceneLayerStructure {
  /** Group and deformer ancestors of each part, outermost first. */
  readonly groupsByPartId: ReadonlyMap<string, ReadonlyArray<PuppetSceneContainerNode>>
  /** Offscreen groups in scene order. */
  readonly layers: ReadonlyArray<SceneLayer>
}

/** Offscreen ancestors and the effect inherited from the groups below the innermost one. */
export interface InheritedGroupEffect {
  readonly effect: PuppetColorEffect
  /** Outermost first. */
  readonly layerIds: ReadonlyArray<string>
}

const structureByDocument = new WeakMap<PuppetDocument, SceneLayerStructure>()

const collect = (
  nodes: ReadonlyArray<PuppetSceneNode>,
  ancestors: ReadonlyArray<PuppetSceneContainerNode>,
  visible: boolean,
  structure: {
    groupsByPartId: Map<string, ReadonlyArray<PuppetSceneContainerNode>>
    layers: Array<SceneLayer>
  },
) => {
  for (const node of nodes) {
    const nodeVisible = visible && node.visible
    if (isSceneContainerNode(node)) {
      if (node.kind === 'group' && node.properties?.offscreen === true) {
        structure.layers.push({ancestors, group: node, visible: nodeVisible})
      }
      collect(node.children, [...ancestors, node], nodeVisible, structure)
    } else {
      structure.groupsByPartId.set(node.id, ancestors)
    }
  }
}

export const getSceneLayerStructure = (document: PuppetDocument): SceneLayerStructure => {
  let structure = structureByDocument.get(document)
  if (structure === undefined) {
    const collected = {groupsByPartId: new Map(), layers: []}
    collect(getDocumentScene(document).roots, [], true, collected)
    structure = collected
    structureByDocument.set(document, structure)
  }
  return structure
}

/**
 * Folds container properties from the outermost container inwards: a plain group's or a
 * deformer's effect applies after everything inside it, and an offscreen group starts a new layer
 * whose content inherits nothing.
 */
export const inheritGroupEffects = (
  groups: ReadonlyArray<PuppetSceneContainerNode>,
  resolve: (
    group: PuppetSceneContainerNode,
  ) => ResolvedGroupRenderProperties = getContainerRenderProperties,
): InheritedGroupEffect =>
  groups.reduce<InheritedGroupEffect>(
    (inherited, group) => {
      const properties = resolve(group)
      return properties.offscreen
        ? {effect: IDENTITY_COLOR_EFFECT, layerIds: [...inherited.layerIds, group.id]}
        : {
            effect: composeColorEffects(
              {
                multiplyColor: properties.multiplyColor,
                opacity: properties.opacity,
                screenColor: properties.screenColor,
              },
              inherited.effect,
            ),
            layerIds: inherited.layerIds,
          }
    },
    {effect: IDENTITY_COLOR_EFFECT, layerIds: []},
  )

/**
 * Moves the members of each layer, recursively, to the position of the first one so that every
 * layer paints contiguously. Relative order is kept.
 */
export const gatherLayers = <Item>(
  items: ReadonlyArray<Item>,
  layerIdsOf: (item: Item) => ReadonlyArray<string>,
  depth = 0,
): ReadonlyArray<Item> => {
  const gathered = new Set<string>()
  return items.flatMap((item) => {
    const layerId = layerIdsOf(item)[depth]
    if (layerId === undefined) {
      return [item]
    }
    if (gathered.has(layerId)) {
      return []
    }
    gathered.add(layerId)
    return gatherLayers(
      items.filter((candidate) => layerIdsOf(candidate)[depth] === layerId),
      layerIdsOf,
      depth + 1,
    )
  })
}
