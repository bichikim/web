import {preventInternalDismiss} from '../../design-system/prevent-internal-dismiss'
import {ContextMenu} from '@kobalte/core/context-menu'
import {For, type JSX, Show} from 'solid-js'

import {useEditorPortalMount} from '../../design-system'

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

export interface EditorContextMenuProps {
  readonly triggerClass?: string
  readonly children: JSX.Element
  readonly disabled?: boolean
  readonly entries: ReadonlyArray<EditorContextMenuEntry>
  readonly label?: string
  readonly onOpenChange?: (open: boolean) => void
  readonly onCloseAutoFocus?: (event: Event) => void
  readonly onInteractOutside?: (event: Event) => void
  readonly onContextMenu?: (event: MouseEvent) => void
  readonly onPointerDown?: (event: PointerEvent) => void
}

interface EditorContextMenuEntryProps {
  readonly entry: EditorContextMenuEntry
}

const EditorContextMenuEntryView = (props: EditorContextMenuEntryProps) => {
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

export const EditorContextMenu = (props: EditorContextMenuProps) => {
  let surface: HTMLDivElement | undefined

  const portalMount = useEditorPortalMount()

  return (
    <ContextMenu modal={false} onOpenChange={(open) => props.onOpenChange?.(open)}>
      <ContextMenu.Trigger
        class={`editor-context-menu-trigger ${props.triggerClass ?? ''}`}
        disabled={props.disabled}
        onContextMenu={props.onContextMenu}
        onPointerDown={props.onPointerDown}
      >
        {props.children}
      </ContextMenu.Trigger>
      <ContextMenu.Portal mount={portalMount}>
        <ContextMenu.Content
          ref={(element) => {
            surface = element
          }}
          aria-label={props.label ?? '작업 메뉴'}
          class="editor-context-menu-content"
          onCloseAutoFocus={props.onCloseAutoFocus}
          onInteractOutside={(event) => {
            props.onInteractOutside?.(event)
            preventInternalDismiss(event, surface)
          }}
        >
          <For each={props.entries}>{(entry) => <EditorContextMenuEntryView entry={entry} />}</For>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu>
  )
}
