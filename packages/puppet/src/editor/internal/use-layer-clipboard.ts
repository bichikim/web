import {type Accessor, createSignal} from 'solid-js'
import type {PuppetDocument} from '../../player'
import type {SceneSelection} from './scene-graph'
import {
  canRemoveLayerNodes,
  createLayerFragment,
  pasteLayerFragment,
  removeLayerNodes,
} from './layer-clipboard'

interface UseLayerClipboardProps {
  readonly document: Accessor<PuppetDocument>
  readonly selection: Accessor<SceneSelection>
  readonly onDocumentChange?: (document: PuppetDocument) => void
  readonly onSelectionChange?: (selection: SceneSelection) => void
}

export interface LayerClipboard {
  readonly canRemove: (nodeId: string) => boolean
  readonly canPaste: Accessor<boolean>
  readonly copy: (nodeId: string) => void
  readonly cut: (nodeId: string) => void
  readonly paste: (nodeId: string | null) => void
  readonly remove: (nodeId: string) => void
}

export const useLayerClipboard = (props: UseLayerClipboardProps): LayerClipboard => {
  const [fragment, setFragment] = createSignal<PuppetDocument>()
  const selectedIds = (nodeId: string) => {
    const selection = props.selection()
    return selection.nodeIds.includes(nodeId) ? selection.nodeIds : [nodeId]
  }
  const remove = (nodeId: string) => {
    const document = removeLayerNodes(props.document(), selectedIds(nodeId))
    if (document !== undefined) {
      props.onDocumentChange?.(document)
      props.onSelectionChange?.({activeNodeId: null, nodeIds: []})
    }
  }
  return {
    canPaste: () => fragment() !== undefined,
    canRemove: (nodeId) => canRemoveLayerNodes(props.document(), selectedIds(nodeId)),
    copy: (nodeId) => setFragment(createLayerFragment(props.document(), selectedIds(nodeId))),
    cut: (nodeId) => {
      const source = props.document()
      const nodeIds = selectedIds(nodeId)
      const document = removeLayerNodes(source, nodeIds)
      if (document !== undefined) {
        setFragment(createLayerFragment(source, nodeIds))
        props.onDocumentChange?.(document)
        props.onSelectionChange?.({activeNodeId: null, nodeIds: []})
      }
    },
    paste: (nodeId) => {
      const snapshot = fragment()
      const result =
        snapshot === undefined ? undefined : pasteLayerFragment(props.document(), snapshot, nodeId)
      if (result !== undefined) {
        props.onDocumentChange?.(result.document)
        props.onSelectionChange?.({
          activeNodeId: result.nodeIds.at(-1) ?? null,
          nodeIds: result.nodeIds,
        })
      }
    },
    remove,
  }
}
