import type {Accessor} from 'solid-js'
import type {ViewerConnection} from '../shared/contracts'
import type {FileMutation, ViewerPort, WorkspaceSelection} from './types'
import type {useFileTree} from './use-file-tree'
import {useFileRenaming} from './use-file-renaming'
import {useFileOperations} from './use-file-operations'
import {useTreeContextMenu} from './use-tree-context-menu'

interface UseTreeFileActionsProps {
  readonly onChanged: (change: FileMutation) => Promise<void>
  readonly pendingPaths: Accessor<readonly string[]>
  readonly port: ViewerPort
  readonly saving: Accessor<boolean>
  readonly session: Accessor<ViewerConnection | null>
  readonly tree: ReturnType<typeof useFileTree>
  readonly visible: Accessor<boolean>
}
export const useTreeFileActions = (props: UseTreeFileActionsProps) => {
  const menu = useTreeContextMenu({
    node: props.tree.node,
    onFocus: props.tree.focus,
    session: props.session,
    visible: props.visible,
  })
  const operations = useFileOperations({
    onChanged: props.onChanged,
    onRefresh: props.tree.reload,
    pendingPaths: props.pendingPaths,
    port: props.port,
    saving: props.saving,
    session: props.session,
  })
  const renaming = useFileRenaming({
    ...props,
    busy: operations.pending,
    onRefresh: props.tree.reload,
  })
  const keyboard = (event: KeyboardEvent, path: string): boolean => {
    if (menu.handleKeyboard(event, path)) {
      return true
    }
    const session = props.session()
    const node = props.tree.node(path)
    if (session === null || node === undefined || event.isComposing || event.altKey) {
      return false
    }
    const selection: WorkspaceSelection = {
      kind: node.kind,
      path: `${session.workspace.replace(/\/$/u, '')}/${path}`,
    }
    const key = event.key.toLowerCase()
    const command = event.ctrlKey || event.metaKey
    const shortcuts = new Map([
      ['c', operations.copy],
      ['v', operations.paste],
      ['x', operations.cut],
    ])
    const action = command
      ? shortcuts.get(key)
      : key === 'delete'
        ? operations.askDelete
        : undefined
    if (action === undefined) {
      return false
    }
    event.preventDefault()
    event.stopPropagation()
    action(selection)
    return true
  }
  return {...operations, ...renaming, ...menu, keyboard}
}
