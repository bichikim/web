import {preventInternalDismiss} from '../../design-system/prevent-internal-dismiss'
import {ContextMenu} from '@kobalte/core/context-menu'
import {createEffect, createSignal, For} from 'solid-js'
import {type JSX} from '@solidjs/web'
import {useEditorPortalMount} from '../../design-system'
import type {EditorContextMenuEntry} from './context-menu/types'
import {EditorContextMenuEntryView} from './context-menu/EditorContextMenuEntryView'

export interface EditorContextMenuProps {
  readonly triggerClass?: string
  readonly children: JSX.Element
  readonly disabled?: boolean
  readonly canOpen?: () => boolean
  readonly entries: ReadonlyArray<EditorContextMenuEntry>
  readonly label?: string
  readonly onOpenChange?: (open: boolean) => void
  readonly onCloseFocus?: () => void
  readonly onInteractOutside?: (event: Event) => void
  readonly onContextMenu?: (event: MouseEvent) => void
  readonly onPointerDown?: (event: PointerEvent) => void
}

export const EditorContextMenu = (props: EditorContextMenuProps) => {
  let surface: HTMLDivElement | undefined

  const portalMount = useEditorPortalMount()
  const [open, setOpen] = createSignal(false)
  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    props.onOpenChange?.(next)
  }
  createEffect(
    open,
    (isOpen) => {
      if (!isOpen) {
        props.onCloseFocus?.()
      }
    },
    {defer: true},
  )

  const handleContextMenu = (event: MouseEvent) => {
    props.onContextMenu?.(event)
    if (props.canOpen?.() === false) {
      event.preventDefault()
    }
  }
  return (
    <ContextMenu modal={false} onOpenChange={handleOpenChange}>
      <ContextMenu.Trigger
        class={`editor-context-menu-trigger ${props.triggerClass ?? ''}`}
        disabled={props.disabled}
        onContextMenu={handleContextMenu}
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
          onInteractOutside={(event) => {
            preventInternalDismiss(event, surface)
            if (!event.defaultPrevented) {
              props.onInteractOutside?.(event)
            }
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
