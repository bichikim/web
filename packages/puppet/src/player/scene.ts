import type {PuppetDocument, PuppetScene, PuppetSceneNode, PuppetScenePartNode} from './document'

export interface PuppetScenePartState {
  readonly locked: boolean
  readonly partId: string
  readonly visible: boolean
}

interface FlattenSceneOptions {
  readonly locked: boolean
  readonly nodes: ReadonlyArray<PuppetSceneNode>
  readonly parts: Array<PuppetScenePartState>
  readonly visible: boolean
}

export const createFlatScene = (document: PuppetDocument): PuppetScene => ({
  roots: document.parts.map(
    (part): PuppetScenePartNode => ({
      id: part.id,
      kind: 'part',
      locked: false,
      name: part.id,
      visible: true,
    }),
  ),
})

export const getDocumentScene = (document: PuppetDocument): PuppetScene =>
  document.scene ?? createFlatScene(document)

const flattenNodes = (options: FlattenSceneOptions) => {
  for (const node of options.nodes) {
    const visible = options.visible && node.visible
    const locked = options.locked || node.locked

    switch (node.kind) {
      case 'group':
        flattenNodes({locked, nodes: node.children, parts: options.parts, visible})
        break
      case 'part':
        options.parts.push({locked, partId: node.id, visible})
        break
      default: {
        const exhaustiveNode: never = node
        return exhaustiveNode
      }
    }
  }
}

export const getScenePartStates = (document: PuppetDocument) => {
  const parts: Array<PuppetScenePartState> = []
  flattenNodes({locked: false, nodes: getDocumentScene(document).roots, parts, visible: true})
  return parts
}

export const getRenderableParts = (document: PuppetDocument) => {
  const partById = new Map(document.parts.map((part) => [part.id, part]))
  return getScenePartStates(document).flatMap((state) => {
    const part = partById.get(state.partId)
    return state.visible && part !== undefined ? [part] : []
  })
}
