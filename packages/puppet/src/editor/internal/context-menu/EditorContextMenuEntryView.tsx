import {ContextMenu} from '@kobalte/core/context-menu'
import {Show} from 'solid-js'
import type {EditorContextMenuEntry} from './types'

interface EditorContextMenuEntryProps {
  readonly entry: EditorContextMenuEntry
}

export const EditorContextMenuEntryView = (props: EditorContextMenuEntryProps) => {
  const action = () => (props.entry.type === 'action' ? props.entry : null)

  return (
    <Show
      when={action()}
      fallback={<ContextMenu.Separator class="editor-context-menu-separator" />}
    >
      {(entry) => (
        <ContextMenu.Item
          class="editor-context-menu-item"
          classList={{danger: entry().tone === 'danger'}}
          disabled={entry().disabled || entry().onSelect === undefined}
          textValue={entry().label}
          onSelect={() => entry().onSelect?.()}
        >
          <ContextMenu.ItemLabel>{entry().label}</ContextMenu.ItemLabel>
          {entry().shortcut === undefined ? null : (
            <span class="editor-context-menu-shortcut" aria-hidden="true">
              {entry().shortcut}
            </span>
          )}
        </ContextMenu.Item>
      )}
    </Show>
  )
}
