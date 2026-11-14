import {preventInternalDismiss} from '../../design-system/prevent-internal-dismiss'
import {ContextMenu} from '@kobalte/core/context-menu'
import {For, type JSX} from 'solid-js'
import {useEditorPortalMount} from '../../design-system'
import type {EditorContextMenuEntry} from './context-menu/types'
import {EditorContextMenuEntryView} from './context-menu/EditorContextMenuEntryView'

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

export type {EditorContextMenuAction} from './context-menu/types'

export type {EditorContextMenuSeparator} from './context-menu/types'

export type {EditorContextMenuEntry} from './context-menu/types'
