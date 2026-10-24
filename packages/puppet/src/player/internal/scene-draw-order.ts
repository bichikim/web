import {
  composeParameterGroupDrawOrder,
  composeParameterPartDrawOrder,
} from '../../deformation/draw-order'
import type {PuppetParameterValueMap} from '../../deformation'
import type {PuppetDocument, PuppetSceneNode} from '../document'
import {getDocumentScene, getScenePartStates, type PuppetScenePartState} from '../scene'
import {isParameterVisible} from '../parameter-visibility'

interface DrawOrderItem {
  readonly drawOrder: number
  readonly states: ReadonlyArray<PuppetScenePartState>
}

interface SortContext {
  readonly document: PuppetDocument
  readonly parameterValues?: PuppetParameterValueMap
  readonly sourceOrder?: ReadonlyMap<string, number>
}

const isDrawOrderGroup = (node: PuppetSceneNode) =>
  node.kind === 'group' &&
  (node.properties?.drawOrder !== undefined || node.properties?.offscreen === true)

const hasGroupOrder = (nodes: ReadonlyArray<PuppetSceneNode>): boolean =>
  nodes.some(
    (node) =>
      node.kind !== 'part' &&
      ((node.kind === 'group' && node.properties?.drawOrder !== undefined) ||
        hasGroupOrder(node.children)),
  )

/** Whether any part or group has a draw order, static or keyed; otherwise scene order stands. */
const usesDrawOrder = (document: PuppetDocument) => {
  const keyed = (document.parameterBindings ?? []).some((binding) =>
    binding.keyforms.some(
      (keyform) =>
        keyform.parts.some((part) => part.properties?.drawOrder !== undefined) ||
        (keyform.groups ?? []).some((group) => group.properties.drawOrder !== undefined),
    ),
  )
  return (
    keyed ||
    document.parts.some((part) => part.properties?.drawOrder !== undefined) ||
    hasGroupOrder(getDocumentScene(document).roots)
  )
}

/**
 * The sortable items of one level: parts and draw order groups (whose descendants sort among
 * themselves); other containers pass their descendants up to this level.
 */
const collectItems = (
  nodes: ReadonlyArray<PuppetSceneNode>,
  inherited: {readonly locked: boolean; readonly visible: boolean},
  context: SortContext,
): Array<DrawOrderItem> =>
  nodes.flatMap((node): Array<DrawOrderItem> => {
    const flags = {
      locked: inherited.locked || node.locked,
      visible:
        inherited.visible && isParameterVisible(node, context.document, context.parameterValues),
    }
    if (node.kind === 'part') {
      return [
        {
          drawOrder: composeParameterPartDrawOrder(
            context.document,
            node.id,
            context.parameterValues,
          ),
          states: [{...flags, partId: node.id}],
        },
      ]
    }
    if (node.kind === 'group' && isDrawOrderGroup(node)) {
      return [
        {
          drawOrder: composeParameterGroupDrawOrder(
            context.document,
            node,
            context.parameterValues,
          ),
          states: sortItems(collectItems(node.children, flags, context), context),
        },
      ]
    }
    return collectItems(node.children, flags, context)
  })

/** Stable sort by draw order, back (low) to front (high); ties keep scene order. */
const sortItems = (items: ReadonlyArray<DrawOrderItem>, context: SortContext) =>
  items
    .map((item) => ({
      ...item,
      sourceOrder:
        context.sourceOrder === undefined
          ? 0
          : Math.min(
              ...item.states.map((state) => context.sourceOrder!.get(state.partId) ?? Infinity),
            ),
    }))
    .toSorted(
      (first, second) =>
        first.drawOrder - second.drawOrder || first.sourceOrder - second.sourceOrder,
    )
    .flatMap((item) => item.states)

/**
 * Scene parts in paint order (back to front) after Cubism draw order: parts and draw order
 * groups sort by their keyed draw order within each level.
 */
export const getDrawOrderedPartStates = (
  document: PuppetDocument,
  parameterValues?: PuppetParameterValueMap,
): ReadonlyArray<PuppetScenePartState> => {
  const context: SortContext = {
    document,
    parameterValues,
    sourceOrder:
      document.drawOrderTieBreak === 'parts'
        ? new Map(document.parts.map((part, index) => [part.id, index]))
        : undefined,
  }
  return usesDrawOrder(document) || document.drawOrderTieBreak === 'parts'
    ? sortItems(
        collectItems(getDocumentScene(document).roots, {locked: false, visible: true}, context),
        context,
      )
    : getScenePartStates(document, parameterValues)
}
