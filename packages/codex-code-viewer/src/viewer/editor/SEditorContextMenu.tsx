import {SContextMenu} from '../SContextMenu'
import type {ContextMenuCloseOptions} from '../types'

interface SEditorContextMenuProps {
  readonly x: number
  readonly y: number
  readonly onCopy?: () => void
  readonly onCut?: () => void
  readonly onPaste?: () => void
  readonly onShare?: () => void
  readonly onFind?: () => void
  readonly onClose?: (options?: ContextMenuCloseOptions) => void
}

export const SEditorContextMenu = (props: SEditorContextMenuProps) => (
  <SContextMenu
    x={props.x}
    y={props.y}
    label="코드 편집 작업"
    items={[
      {key: 'c', label: '복사', onSelect: props.onCopy, shortcut: '⌘/Ctrl C'},
      {key: 'x', label: '잘라내기', onSelect: props.onCut, shortcut: '⌘/Ctrl X'},
      {key: 'v', label: '붙여넣기', onSelect: props.onPaste, shortcut: '⌘/Ctrl V'},
      {label: '채팅창에 추가', onSelect: props.onShare, separatorBefore: true},
      {key: 'f', label: '파일 내 검색', onSelect: props.onFind, shortcut: '⌘/Ctrl F'},
    ]}
    onClose={props.onClose}
  />
)
