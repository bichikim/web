import {cx} from 'class-variance-authority'
import {DropdownMenu} from '@kobalte/core/dropdown-menu'
import {type Accessor, type JSX, Show, splitProps} from 'solid-js'
import type {SelectMenuController} from './use-select-menu'

const callEventHandler = <E extends Event>(
  handler: JSX.EventHandlerUnion<HTMLDivElement, E> | undefined,
  event: Parameters<JSX.EventHandler<HTMLDivElement, E>>[0],
) => {
  if (typeof handler === 'function') {
    handler(event)

    return
  }

  handler?.[0](handler[1], event)
}

export interface HSelectContentProps extends Omit<
  JSX.HTMLAttributes<HTMLDivElement>,
  'ref' | 'style'
> {
  /** When used outside `HSelectRoot`, pass a controller from `useSelectMenu`. */
  controller?: SelectMenuController
  /** Static position override (e.g. Storybook); defaults to controller positioning. */
  left?: Accessor<number>
  top?: Accessor<number>
  children: JSX.Element
  popover?: 'auto' | 'manual'
  widthPx?: number
}

/** Menu content backed by Kobalte or a legacy controller. */
export const HSelectContent = (props: HSelectContentProps) => {
  const [local, contentProps] = splitProps(props, [
    'children',
    'class',
    'controller',
    'id',
    'left',
    'onKeyDown',
    'onToggle',
    'popover',
    'role',
    'top',
    'widthPx',
  ])

  const handleLegacyKeyDown: JSX.EventHandler<HTMLDivElement, KeyboardEvent> = (event) => {
    callEventHandler(local.onKeyDown, event)

    if (!event.defaultPrevented) {
      local.controller?.handleContentKeyDown(event)
    }
  }

  const handleLegacyToggle: JSX.EventHandler<HTMLDivElement, ToggleEvent> = (event) => {
    callEventHandler(local.onToggle, event)

    if (!event.defaultPrevented) {
      local.controller?.onPanelToggle()
    }
  }

  const positionClass = () =>
    cx(local.class, {
      'left-[var(--select-menu-left)]!': local.controller !== undefined || local.left !== undefined,
      'top-[var(--select-menu-top)]!': local.controller !== undefined || local.top !== undefined,
      'w-[var(--select-menu-width)]!': local.widthPx !== undefined,
    })

  return (
    <Show
      when={local.controller}
      fallback={
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            {...contentProps}
            id={local.id}
            role={local.role ?? 'menu'}
            class={positionClass()}
            style={{
              '--select-menu-left': local.left ? `${local.left()}px` : undefined,
              '--select-menu-top': local.top ? `${local.top()}px` : undefined,
              '--select-menu-width': local.widthPx === undefined ? undefined : `${local.widthPx}px`,
            }}
            onKeyDown={local.onKeyDown}
          >
            {local.children}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      }
    >
      {(controller) => (
        <div
          {...contentProps}
          ref={controller().registerPanel}
          id={local.id}
          role={local.role ?? 'menu'}
          class={positionClass()}
          popover={local.popover ?? 'auto'}
          style={{
            '--select-menu-left': `${local.left?.() ?? controller().left()}px`,
            '--select-menu-top': `${local.top?.() ?? controller().top()}px`,
            '--select-menu-width': local.widthPx === undefined ? undefined : `${local.widthPx}px`,
          }}
          onKeyDown={handleLegacyKeyDown}
          onToggle={handleLegacyToggle}
        >
          {local.children}
        </div>
      )}
    </Show>
  )
}
