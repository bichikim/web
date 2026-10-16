import {createMemo, createSignal, type JSX} from 'solid-js'
import type {PuppetSceneNode} from '../../player'
import type {LayerClipboard} from './use-layer-clipboard'
import {EditorContextMenu} from './EditorContextMenu'
import {createLayerMenuEntries} from './create-layer-menu-entries'

interface EditorLayerRowMenuProps {
  readonly children: JSX.Element
  readonly clipboard: LayerClipboard
  readonly disabled: boolean
  readonly editable: boolean
  readonly locked: boolean
  readonly node: PuppetSceneNode
  readonly selected: boolean
  readonly onRename: () => void
  readonly onSelect: (event: MouseEvent, node: PuppetSceneNode) => void
}

export const EditorLayerRowMenu = (props: EditorLayerRowMenuProps) => {
  const [renaming, setRenaming] = createSignal(false)
  const handleRename = () => {
    setRenaming(true)
    props.onRename()
  }
  const handleContextMenu = (event: MouseEvent) => {
    event.stopPropagation()
    if (!props.selected) {
      props.onSelect(event, props.node)
    }
  }
  const handleCloseAutoFocus = (event: Event) => {
    if (renaming()) {
      event.preventDefault()
    }
  }
  const entries = createMemo(() =>
    createLayerMenuEntries({
      clipboard: props.clipboard,
      editable: props.editable,
      locked: props.locked,
      node: props.node,
      onRename: handleRename,
    }),
  )
  return (
    <EditorContextMenu
      entries={entries()}
      label={`${props.node.name} 레이어 작업`}
      disabled={props.disabled}
      triggerClass="puppet-layer-row-menu"
      onContextMenu={handleContextMenu}
      onCloseAutoFocus={handleCloseAutoFocus}
      onOpenChange={(open) => {
        if (open) {
          setRenaming(false)
        }
      }}
    >
      {props.children}
    </EditorContextMenu>
  )
}
