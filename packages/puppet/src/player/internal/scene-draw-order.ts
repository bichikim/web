import {
  composeParameterGroupDrawOrder,
  composeParameterPartDrawOrder,
} from '../../deformation/draw-order'
import type {PuppetParameterValueMap} from '../../deformation'
import {PUPPET_DEFAULT_DRAW_ORDER, type PuppetDocument, type PuppetSceneNode} from '../document'
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

interface OrderSnapshot {
  readonly values: ReadonlyArray<number | undefined>
  readonly states: ReadonlyArray<PuppetScenePartState>
}

interface DrawOrderFrame {
  readonly context: Omit<SortContext, 'parameterValues'>
  readonly parameterIds: ReadonlyArray<string>
  readonly roots: ReadonlyArray<PuppetSceneNode>
  readonly sortable: boolean
  snapshot?: OrderSnapshot
}

const getVisibilityParameters = (nodes: ReadonlyArray<PuppetSceneNode>): ReadonlyArray<string> =>
  nodes.flatMap((node) => [
    ...(node.parameterVisibility ?? []).map((range) => range.parameterId),
    ...(node.kind === 'part' ? [] : getVisibilityParameters(node.children)),
  ])

const getGroupOrders = (
  nodes: ReadonlyArray<PuppetSceneNode>,
): ReadonlyArray<readonly [string, number]> =>
  nodes.flatMap(
    (node): ReadonlyArray<readonly [string, number]> =>
      node.kind === 'part'
        ? []
        : [
            ...(node.kind === 'group'
              ? ([[node.id, node.properties?.drawOrder ?? PUPPET_DEFAULT_DRAW_ORDER]] as const)
              : []),
            ...getGroupOrders(node.children),
          ],
  )

const getOrderParameters = (document: PuppetDocument): ReadonlyArray<string> => {
  const partOrders = new Map(
    document.parts.map((part) => [
      part.id,
      part.properties?.drawOrder ?? PUPPET_DEFAULT_DRAW_ORDER,
    ]),
  )
  const groupOrders = new Map(getGroupOrders(getDocumentScene(document).roots))
  return (document.parameterBindings ?? [])
    .filter(
      (binding) =>
        // Legacy triangulated channels can change an equal rest order through rounding alone.
        (binding.interpolation !== 'grid' && binding.parameterIds.length > 1) ||
        binding.keyforms.some(
          (form) =>
            // Constant rest channels are omitted by the draw-order sampler as well.
            form.parts.some(
              (part) =>
                part.properties?.drawOrder !== undefined &&
                part.properties.drawOrder !== partOrders.get(part.partId),
            ) ||
            form.groups?.some(
              (group) =>
                group.properties.drawOrder !== undefined &&
                group.properties.drawOrder !== groupOrders.get(group.groupId),
            ),
        ),
    )
    .flatMap((binding) => [
      ...binding.parameterIds,
      ...(binding.influences ?? []).map((influence) => influence.parameterId),
    ])
}

const orderFrames = new WeakMap<PuppetDocument, DrawOrderFrame>()

const getOrderFrame = (document: PuppetDocument): DrawOrderFrame => {
  let frame = orderFrames.get(document)
  if (frame === undefined) {
    const {roots} = getDocumentScene(document)
    frame = {
      context: {
        document,
        sourceOrder:
          document.drawOrderTieBreak === 'parts'
            ? new Map(document.parts.map((part, index) => [part.id, index]))
            : undefined,
      },
      parameterIds: [
        ...new Set([...getOrderParameters(document), ...getVisibilityParameters(roots)]),
      ],
      roots,
      sortable: usesDrawOrder(document) || document.drawOrderTieBreak === 'parts',
    }
    orderFrames.set(document, frame)
  }
  return frame
}

/**
 * Scene parts in paint order (back to front) after Cubism draw order: parts and draw order
 * groups sort by their keyed draw order within each level. Immutable documents retain the
 * latest readonly snapshot until an ordering or visibility input changes.
 */
export const getDrawOrderedPartStates = (
  document: PuppetDocument,
  parameterValues?: PuppetParameterValueMap,
): ReadonlyArray<PuppetScenePartState> => {
  const frame = getOrderFrame(document)
  const values = frame.parameterIds.map((id) => parameterValues?.[id])
  const previous = frame.snapshot
  if (
    previous !== undefined &&
    values.every((value, index) => Object.is(value, previous.values[index]))
  ) {
    return previous.states
  }
  const context: SortContext = {
    ...frame.context,
    parameterValues,
  }
  const states = frame.sortable
    ? sortItems(collectItems(frame.roots, {locked: false, visible: true}, context), context)
    : getScenePartStates(document, parameterValues)
  frame.snapshot = {states, values}
  return states
}
