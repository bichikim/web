import type {EditorContextMenuEntry} from './EditorContextMenu'
import type {LayerClipboard} from './use-layer-clipboard'

interface CreateLayerMenuEntriesOptions {
  readonly clipboard: LayerClipboard
  readonly node: {readonly id: string}
  readonly locked: boolean
  readonly editable: boolean
  readonly onRename: () => void
}

export const createLayerMenuEntries = (
  options: CreateLayerMenuEntriesOptions,
): ReadonlyArray<EditorContextMenuEntry> => {
  return [
    {
      id: 'copy',
      label: '복사',
      onSelect: () => options.clipboard.copy(options.node.id),
      type: 'action',
    },
    {
      disabled: !options.editable || !options.clipboard.canRemove(options.node.id),
      id: 'cut',
      label: '잘라내기',
      onSelect: () => options.clipboard.cut(options.node.id),
      type: 'action',
    },
    ...(options.clipboard.canPaste()
      ? [
          {
            disabled: options.locked || !options.editable,
            id: 'paste',
            label: '붙여넣기',
            onSelect: () => options.clipboard.paste(options.node.id),
            type: 'action' as const,
          },
        ]
      : []),
    {id: 'separator', type: 'separator'},
    {
      disabled: options.locked || !options.editable,
      id: 'rename',
      label: '이름 바꾸기',
      onSelect: options.onRename,
      type: 'action',
    },
    {
      disabled: !options.editable || !options.clipboard.canRemove(options.node.id),
      id: 'delete',
      label: '삭제',
      onSelect: () => options.clipboard.remove(options.node.id),
      tone: 'danger',
      type: 'action',
    },
  ]
}
