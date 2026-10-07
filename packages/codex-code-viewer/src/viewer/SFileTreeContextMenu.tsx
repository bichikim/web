import type {ContextMenuCloseOptions, WorkspaceSelection} from './types'
import {SContextMenu} from './SContextMenu'

interface SFileTreeContextMenuProps {
  x: number
  y: number
  selection: WorkspaceSelection
  onShare?: (selection: WorkspaceSelection) => void
  onCopy?: (path: string) => void
  onClose?: (options?: ContextMenuCloseOptions) => void
}

export const SFileTreeContextMenu = (props: SFileTreeContextMenuProps) => (
  <SContextMenu
    x={props.x}
    y={props.y}
    label="파일 트리 작업"
    items={[
      {
        label: '채팅창에 추가',
        onSelect: props.onShare === undefined ? undefined : () => props.onShare?.(props.selection),
      },
      {
        key: 'c',
        label: '경로 복사',
        onSelect:
          props.onCopy === undefined ? undefined : () => props.onCopy?.(props.selection.path),
        shortcut: '⌘/Ctrl+C',
      },
    ]}
    onClose={props.onClose}
  />
)
