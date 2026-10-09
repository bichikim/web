import type {ContextMenuCloseOptions, WorkspaceSelection} from './types'
import {SContextMenu} from './SContextMenu'

interface SFileTreeContextMenuProps {
  x: number
  y: number
  selection: WorkspaceSelection
  canModify?: boolean
  canPaste?: boolean
  onCopyEntry?: (selection: WorkspaceSelection) => void
  onCutEntry?: (selection: WorkspaceSelection) => void
  onPasteEntry?: (selection: WorkspaceSelection) => void
  onRenameEntry?: (selection: WorkspaceSelection) => void
  onDeleteEntry?: (selection: WorkspaceSelection) => void
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
        key: 'c',
        label: '복사',
        onSelect: props.canModify ? () => props.onCopyEntry?.(props.selection) : undefined,
        shortcut: '⌘/Ctrl+C',
      },
      {
        key: 'x',
        label: '잘라내기',
        onSelect: props.canModify ? () => props.onCutEntry?.(props.selection) : undefined,
        shortcut: '⌘/Ctrl+X',
      },
      {
        key: 'v',
        label: '붙여넣기',
        onSelect: props.canPaste ? () => props.onPasteEntry?.(props.selection) : undefined,
        shortcut: '⌘/Ctrl+V',
      },
      {
        label: '채팅창에 추가',
        onSelect: props.onShare === undefined ? undefined : () => props.onShare?.(props.selection),
        separatorBefore: true,
      },
      {
        label: '경로 복사',
        onSelect:
          props.onCopy === undefined ? undefined : () => props.onCopy?.(props.selection.path),
      },
      {
        label: '이름 변경',
        onSelect: props.canModify ? () => props.onRenameEntry?.(props.selection) : undefined,
        separatorBefore: true,
      },
      {
        label: '삭제',
        onSelect: props.canModify ? () => props.onDeleteEntry?.(props.selection) : undefined,
        separatorBefore: true,
      },
    ]}
    onClose={props.onClose}
  />
)
