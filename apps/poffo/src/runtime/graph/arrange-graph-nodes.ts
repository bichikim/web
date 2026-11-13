import type {Node} from '@dschz/solid-flow'
const COLUMN_POSITIONS: Readonly<Record<string, number>> = {
  correction: 270,
  parameterGroup: 1000,
  parameters: 650,
}
const CARD_GAP = 40
const DEFAULT_HEIGHT = 290
export const arrangeGraphNodes = (nodes: ReadonlyArray<Node>): Node[] => {
  const offsets = new Map<number, number>()
  return nodes.map((node) => {
    if (node.parentId !== undefined) {
      return node
    }
    const x = COLUMN_POSITIONS[node.type ?? ''] ?? 0
    const y = offsets.get(x) ?? 0
    offsets.set(x, y + (node.measured?.height ?? node.height ?? DEFAULT_HEIGHT) + CARD_GAP)
    return {...node, position: {x, y}}
  })
}
