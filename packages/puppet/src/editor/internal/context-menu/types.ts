export interface EditorContextMenuAction {
  readonly disabled?: boolean
  readonly id: string
  readonly label: string
  readonly onSelect?: () => void
  readonly shortcut?: string
  readonly tone?: 'danger' | 'default'
  readonly type: 'action'
}

export interface EditorContextMenuSeparator {
  readonly id: string
  readonly type: 'separator'
}

export type EditorContextMenuEntry = EditorContextMenuAction | EditorContextMenuSeparator
